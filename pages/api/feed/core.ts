import axios from 'axios'
import _ from 'lodash'
import {
  Product,
  ChannableProduct,
  ChannablePrice,
  FPReturnObj,
  GetRange,
  UpdateProduct,
	GetProductsXML,
} from './@types'
import CLayer from '@commercelayer/js-sdk'
import { FilterProducts, AddPrices } from './@types/index'

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
						value: '',
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

					const productImg = _.first(p.images)?.url || ''
					const productAdditionalImgs = p.images?.slice(1).map((i) => {
						// if (i.url && IMG_QUERY) return encodeURIComponent(`${i.url}?${IMG_QUERY}`)
						return `${i.url}?${IMG_QUERY}`
						// return encodeURIComponent(i.url)
						return i.url
					})

					const mainSku = _.first(p.variants)?.code || ''

					if (mainSku.length > 0 && returnObj.skuCodes.indexOf(mainSku) === -1) {
						returnObj.skuCodes.push(mainSku)
					}

					for (let j in p.variants) {
						let v = p.variants[j]
						if (storeViewsEnabled(v)) {
							const skuCode = v.code

							const variantImg = _.first(v.images)?.url || ''
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
								sku: v.code,
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
						
							if (skus.indexOf(v.code) === -1) {
								returnObj.products.push(gProduct)
								skus.push(v.code)
							}
						}
					}
				}
			})
		}
	})
  return returnObj
}

const addPrices: AddPrices = ({ skuCodes, products }) => {
	const getPrices = CLayer.Price.where({
    skuCodeIn: skuCodes.join(','),
	}).all()
  const updatedProductsWithPrices = getPrices.then(async (prices) => {
		let pricesData: any[] = []

		prices.toArray().map((p) => {
			pricesData[p.skuCode] = {
				value: p.amountFloat,
				currency: p.currencyCode,
				currencySymbol: p.formattedAmount.charAt(0)
			}
		})
		const pageCount = prices.pageCount()
		let nextPrs = prices
		if (prices.hasNextPage() && pageCount) {
			for (let count = 1; count < pageCount; count++) {
				nextPrs = await nextPrs.nextPage()
				nextPrs.toArray().map((p) => {
					pricesData[p.skuCode] = {
						value: p.amountFloat,
						currency: p.currencyCode,
						currencySymbol: p.formattedAmount.charAt(0)
					}
				})
			}
		}

		for (let index in products) {
			products[index].price = {
				currency: pricesData[products[index].mainSku].currency,
				value: pricesData[products[index].mainSku].value
			};

			products[index].customLabel1 = getRange(
				pricesData[products[index].mainSku].value,
				pricesData[products[index].mainSku].currencySymbol
			);
		}

		return products
	});
	return updatedProductsWithPrices
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
			<additional_image_link>${p.additionalImageLinks.join(',')}</additional_image_link>
			<availability>${p.availability}</availability>
			<brand>Uashmama</brand>
			<color>${p.color}</color>
			<condition>${p.condition}</condition> 
			<description><![CDATA[${escapeHtml(p.description)}]]></description>
			<id>${p.sku}</id>
			<image_link>${p.imageLink}</image_link>
			<link>${p.link}</link>
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

const getData = async () => {
  const {
    CL_CLIENT_ID,
    CL_ENDPOINT,
    CL_MARKET_ID,
    DT_AUTH,
		DT_ENDPOINT,
		DT_LOCALE,
		DT_STOREVIEWS
	} = process.env
	
	const clToken = await axios({
		url: `${CL_ENDPOINT}/oauth/token`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		data: JSON.stringify({
			grant_type: 'client_credentials',
			client_id: CL_CLIENT_ID,
			scope: `market:${CL_MARKET_ID}`,
		}),
	})
	if (clToken.data.access_token) {
		try {
			CLayer.init({
				accessToken: clToken.data.access_token,
				endpoint: CL_ENDPOINT as string,
			})
		} catch (error) {
			console.info('clInitError', error)
		}
	}

	const datoCms = await axios({
    url: DT_ENDPOINT,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DT_AUTH}`,
    },
		data: JSON.stringify({
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
	}).then(({ data }) => {
		let products = filterProducts(data)
		const productsWithPrice = addPrices(products).then(productsWithPriceData => {
			return productsWithPriceData
		})
		return productsWithPrice
	});

	// console.info('product data', datoCms[0])

	return getProductsXML(datoCms);
}

export default getData
