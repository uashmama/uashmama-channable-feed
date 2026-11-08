import { authenticate } from '@commercelayer/js-auth'
import { CommerceLayer, type CommerceLayerClient } from '@commercelayer/sdk'
import {
  Product,
  ChannableProduct,
  ChannablePrice,
  FPReturnObj,
  GetRange,
	GetProductsXML,
	FilterProducts,
	AddPrices,
} from './@types'

const getRange: GetRange = (amountFloat, currencySymbol) => {
  let range = ''
  if (amountFloat < 25) {
    range = `< 25 ${currencySymbol}`
  }
  if (amountFloat >= 25 && amountFloat <= 50) {
    range = `25-50 ${currencySymbol}`
  }
  if (amountFloat >= 50 && amountFloat <= 100) {
    range = `50-100 ${currencySymbol}`
  }
  if (amountFloat > 100) {
    range = `> 100 ${currencySymbol}`
  }
  return range
}

const filterProducts: FilterProducts = (response) => {
	const { DT_LOCALE, PERMALINK_BASE, IMG_QUERY } = process.env
	const skus: string[] = []
	const returnObj: FPReturnObj = {
    skuCodes: [],
    products: [],
  }
	response.data.allCategories.map((cat) => {
		if (cat.feedIgnore !== true) {
			cat.products.map((p: Product): any => {
				if (storeViewsEnabled(p)) {
					const price: ChannablePrice = {
						value: 0,
						currency: '',
						currencySymbol: ''
					}
					const name = p.name.length ? p.name : p.nameEn
					const description = p.description.length ? p.description : p.descriptionEn
					let material = ''
					if (p.material != undefined) {
						if (p.material.name.length > 0) material = p.material.name
						else material = p.material.nameEn
					}
					const offerId = p.permalink
					const permalink = PERMALINK_BASE
						? `${PERMALINK_BASE}${p.permalink}`
						: p.permalink

					const productImg = p.images?.[0]?.url || ''
					const productAdditionalImgs = p.images?.slice(1).map((i) => {
						// if (i.url && IMG_QUERY) return encodeURIComponent(`${i.url}?${IMG_QUERY}`)
						return `${i.url}?${IMG_QUERY}`
						// return encodeURIComponent(i.url)
						return i.url
					})

					const mainSku = p.variants?.[0]?.code?.trim() || ''

					if (mainSku.length > 0 && returnObj.skuCodes.indexOf(mainSku) === -1) {
						returnObj.skuCodes.push(mainSku)
					}

					for (let j in p.variants) {
						let v = p.variants[j]
						if (storeViewsEnabled(v)) {
							const skuCode = v.code.trim()

							const variantImg = v.images?.[0]?.url || ''
							const getImg = variantImg != '' ? variantImg : productImg
							const imgLink = getImg && IMG_QUERY ? `${getImg}?${IMG_QUERY}` : ''

							const variantAdditionalImgs = v.images?.slice(1).map((i) => {
								//if (i.url && IMG_QUERY) return encodeURIComponent(`${i.url}?${IMG_QUERY}`)
								if (i.url && IMG_QUERY) return `${i.url}?${IMG_QUERY}`
								// return encodeURIComponent(i.url)
								return i.url
							})

							let color = ''
							if (v.color != undefined) {
								if (v.color.name.length > 0) color = v.color.name
								else color = v.color.nameEn
							}
							
							const gProduct: ChannableProduct = {
								skuCode,
								sku: skuCode,
								mainSku,
								title: name,
								link: permalink,
								catlink: cat.permalink,
								// imageLink: encodeURIComponent(imgLink),
								imageLink: imgLink,
								color,
								price,
								description,
								availability: 'in stock',
								offerId,
								contentLanguage: DT_LOCALE,
								customLabel0: p.feedTitleOverride,
								customLabel1: '> 100',
								material,
								condition: 'new',
								additionalImageLinks: variantAdditionalImgs.length > 0 ? variantAdditionalImgs : productAdditionalImgs,
								googleCat: cat.id
							}
						
							if (skus.indexOf(skuCode) === -1) {
								returnObj.products.push(gProduct)
								skus.push(skuCode)
							}
						}
					}
				}
			})
		}
	})
  return returnObj
}

const addPrices: AddPrices = async (cl, { skuCodes, products }) => {
	const pricesData: Record<string, ChannablePrice> = {}

	let pageNumber = 1
	let pageCount = 1
	do {
		const prices = await cl.prices.list({
			filters: { sku_code_in: skuCodes.join(',') },
			fields: { prices: ['sku_code', 'amount_float', 'currency_code', 'formatted_amount'] },
			pageSize: 25,
			pageNumber,
		})
		prices.forEach((p) => {
			pricesData[p.sku_code] = {
				value: p.amount_float,
				currency: p.currency_code,
				currencySymbol: p.formatted_amount.charAt(0)
			}
		})
		pageCount = prices.meta.pageCount
		pageNumber++
	} while (pageNumber <= pageCount)

	const missingSkus = skuCodes.filter((code) => !pricesData[code])
	if (missingSkus.length > 0) {
		console.warn(`Products skipped, no price found for main SKUs: ${missingSkus.join(', ')}`)
	}

	return products
		.filter((product) => pricesData[product.mainSku])
		.map((product) => {
			const { value, currency, currencySymbol } = pricesData[product.mainSku]
			return {
				...product,
				price: { value, currency },
				customLabel1: getRange(value, currencySymbol),
			}
		})
}

const escapeHtml: any = (text) => {
	var map = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#039;'
	};

	return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}

const storeViewsEnabled: any = (item) => {
	const {
		DT_STOREVIEWS
	} = process.env

	const enabledMarketsIds = item.enabledMarkets?.length !== 0 ? item.enabledMarkets.map((m: any) => {
		return m.id
	}) : []

	const disabledMarketsIds = item.disabledMarkets?.length !== 0 ? item.disabledMarkets.map((m: any) => {
		return m.id
	}) : []

	return (item.enabledMarkets?.length !== 0 && enabledMarketsIds.indexOf(DT_STOREVIEWS) > -1) && (item.disabledMarkets?.length === 0 || (item.disabledMarkets?.length !== 0 && disabledMarketsIds.indexOf(DT_STOREVIEWS) === -1))
}

const getProductsXML: GetProductsXML = ( products ) => {
	let xmlOutput = `<?xml version='1.0' encoding='utf-8'?><items>`;
	for(let i in products) {
		let p = products[i]
		xmlOutput += `<item>
			<additional_image_link>${escapeHtml(p.additionalImageLinks.join(','))}</additional_image_link>
			<availability>${p.availability}</availability>
			<brand>Uashmama</brand>
			<color>${p.color}</color>
			<condition>${p.condition}</condition> 
			<description><![CDATA[${escapeHtml(p.description)}]]></description>
			<id>${p.sku}</id>
			<image_link>${escapeHtml(p.imageLink)}</image_link>
			<link>${escapeHtml(p.link)}</link>
			<material><![CDATA[${escapeHtml(p.material)}]]></material>
			<price>${p.price.value}</price>
			<product_type>${p.catlink}</product_type>
			<sale_price>${p.price.value}</sale_price>
			<custom_label_0><![CDATA[${p.customLabel0}]]></custom_label_0>
			<size></size>
			<stock></stock>
			<title><![CDATA[${p.title}]]></title>
			<google_product_category><![CDATA[${p.googleCat}]]></google_product_category>
		</item>`;
	}
	xmlOutput += `</items>`;
	return xmlOutput;
}

const getCommerceLayerClient = async (): Promise<CommerceLayerClient> => {
	const { CL_CLIENT_ID, CL_MARKET_CODE } = process.env

	const { accessToken } = await authenticate('client_credentials', {
		clientId: CL_CLIENT_ID,
		scope: `market:code:${CL_MARKET_CODE}`,
	})

	return CommerceLayer({ accessToken, apiVersion: '2026-05' })
}

const getData = async () => {
  const {
    DT_AUTH,
		DT_ENDPOINT,
		DT_LOCALE,
		DT_STOREVIEWS
	} = process.env

	const cl = await getCommerceLayerClient()

	const datoCmsResponse = await fetch(DT_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DT_AUTH}`,
    },
		body: JSON.stringify({
			query: `{ allCategories(first:100, locale: ${DT_LOCALE}, filter: { catalogo: {eq:false} visible: {eq: true} allProductsCategory: {eq: false} enabledMarkets: {anyIn: [${DT_STOREVIEWS}] } disabledMarkets : { notIn: [ ${DT_STOREVIEWS} ] } }){ 
				id
				title 
				titleEn: title(locale: en) 
				feedTitle
				feedIgnore
				permalink 
				products { 
					id 
					name 
					nameEn: name(locale: en) 
					feedTitleOverride
					permalink 
					description 
					descriptionEn: description(locale: en)
					enabledMarkets { id } disabledMarkets { id }
					variants { 
						code images { url } color { name nameEn: name(locale: en) } enabledMarkets { id } disabledMarkets { id }
					} 
					material { 
						name nameEn: name(locale: en) 
					} 
					images { url } 
				} 
			} }` }),
	})
	if (!datoCmsResponse.ok) {
		throw new Error(`DatoCMS request failed with status ${datoCmsResponse.status}`)
	}

	const products = filterProducts(await datoCmsResponse.json())
	const productsWithPrice = await addPrices(cl, products)

	return getProductsXML(productsWithPrice);
}

export default getData
