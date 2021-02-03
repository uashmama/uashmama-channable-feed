import axios from 'axios'
import _ from 'lodash'
import {
  Product,
  GoogleProduct,
  GooglePrice,
  FPReturnObj,
  GetRange,
  UpdateProduct,
} from './@types'
import CLayer from '@commercelayer/js-sdk'
import { FilterProducts, AddPrices } from './@types/index'

const getRange: GetRange = (amountFloat, currencySymbol) => {
  let range = ''
  if (amountFloat < 25) {
    range = `< 25${currencySymbol}`
  }
  if (amountFloat >= 25 && amountFloat <= 50) {
    range = `25-50${currencySymbol}`
  }
  if (amountFloat >= 50 && amountFloat <= 100) {
    range = `50-100${currencySymbol}`
  }
  if (amountFloat > 100) {
    range = `> 100${currencySymbol}`
  }
  return range
}

const updateProduct: UpdateProduct = ({ products, singleProduct }) => {
  const index = _.findIndex(
    products,
    (pr) => pr.skuCode === singleProduct.skuCode
  )
  if (products[index]) {
    products[index].price = {
      currency: singleProduct.currencyCode,
      value: `${singleProduct.amountFloat}`,
    }
    const currencySymbol = singleProduct.formattedAmount.charAt(0)
    products[index].customLabel1 = getRange(
      singleProduct.amountFloat,
      currencySymbol
    )
    delete products[index].skuCode
    return products[index]
  }
  return null
}

const filterProducts: FilterProducts = (response) => {
  const { PERMALINK_BASE, PRODUCT_PREFIX, IMG_QUERY } = process.env
  const ids: string[] = []
  const returnObj: FPReturnObj = {
    skuCodes: [],
    products: [],
  }
  response.data.allCategories.map((cat) => {
    cat.products.map((p: Product): any => {
      const gPrice: GooglePrice = {
        value: '',
        currency: '',
      }
      const id = p.id
      const pName = `${p.name.charAt(0).toUpperCase()}${p.name
        .slice(1)
        .toLocaleLowerCase()}`
      const name = PRODUCT_PREFIX ? `${PRODUCT_PREFIX} ${pName}` : pName
      const material = p.material ? p.material.name : ''
      const skuCode = _.first(p.variants)?.code
      const offerId = p.permalink
      const permalink = PERMALINK_BASE
        ? `${PERMALINK_BASE}${p.permalink}`
        : p.permalink
      const getImg = _.first(p.images)?.url || ''
      const additionalImageLinks = p.images?.slice(1).map((i) => {
        if (i.url && IMG_QUERY) return `${i.url}?${IMG_QUERY}`
        return i.url
      })
      const img = getImg && IMG_QUERY ? `${getImg}?${IMG_QUERY}` : ''
      if (skuCode && ids.indexOf(p.id) === -1) {
        returnObj.skuCodes.push(skuCode)
      }
      const gProduct: GoogleProduct = {
        skuCode,
        id,
        title: name,
        link: permalink,
        imageLink: img,
        price: gPrice,
        description: p.description,
        availability: 'in stock',
        offerId,
        contentLanguage: 'en',
        targetCountry: 'GB',
        channel: 'online',
        customLabel0: 'blank',
        customLabel1: '> 100',
        material,
        condition: 'new',
        additionalImageLinks,
      }
      if (ids.indexOf(p.id) === -1) {
        returnObj.products.push(gProduct)
        ids.push(p.id)
      }
    })
  })
  return returnObj
}

const addPrices: AddPrices = ({ skuCodes, products }) => {
  const getPrices = CLayer.Price.where({
    skuCodeIn: skuCodes.join(','),
	}).all()
  const updatedProductsWithPrices = getPrices.then(async (prices) => {
		let productsWithPrice: GoogleProduct[] = []
		prices.toArray().map((p) => {
			const item = updateProduct({
        products,
        singleProduct: p,
      })
      if (item) {
        productsWithPrice.push(item)
			}
    })
    const pageCount = prices.pageCount()
    let nextPrs = prices
    if (prices.hasNextPage() && pageCount) {
      for (let count = 1; count < pageCount; count++) {
        productsWithPrice = []
        // @ts-ignore
        nextPrs = await nextPrs.nextPage()
        nextPrs.toArray().map((p) => {
					const item = updateProduct({
            products,
            singleProduct: p,
          })
          if (item) {
            productsWithPrice.push(item)
          }
        })
      }
		}
		return productsWithPrice
  }).catch(error => {
		console.info('getPricesError', error)
	})
	return updatedProductsWithPrices
}

const getData = async () => {
  const {
    CL_CLIENT_ID,
    CL_ENDPOINT,
    CL_MARKET_ID,
    DT_AUTH,
		DT_ENDPOINT,
		DT_LOCALE,
		DT_MARKET
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
		data: JSON.stringify({ query: `{ allCategories(first:100, locale: ${DT_LOCALE}, filter: { catalogo: {eq:false} visible: {eq: true} allProductsCategory: {eq: false} enabledMarkets: {anyIn: ${DT_MARKET}} }){ title products { id name permalink description variants { code } material { name } images { url } } } }` }),
	}).then(({ data }) => {
		let products = filterProducts(data)
		const productsWithPrice = addPrices(products).then(productsWithPriceData => {
			return productsWithPriceData
		})
		return productsWithPrice
	}).catch(error => {
		console.info('datoCMSError', error)
	});

	return datoCms;
}

export default getData
