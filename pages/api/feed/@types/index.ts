import { PriceCollection } from '@commercelayer/js-sdk'

export interface Product {
  id: string
  name: string
  material: {
    name: string
  }
  description: string
  permalink: string
  variants: {
		code: string
		images?: {
			url: string
		}[]	
		color: {
			name: string
		}
  }[]
  images?: {
    url: string
  }[]
}

export interface ChannableProduct {
  skuCode?: string
	sku: string
	mainSku: string
  title: string
  description: string
	link: string
	catlink: string
  imageLink: string
  availability: 'in stock' | 'out of stock' | 'preorder'
  price: {
    value: string
    currency: string
  }
  offerId: string
  contentLanguage: string
  customLabel0: string
  customLabel1: string
	material: string
	color: string
  condition: 'new'
  additionalImageLinks?: string[]
}

export type ChannablePrice = {
	value: string
	currency: string
	currencySymbol: string | null
}

export type DatoResponse = {
  data: {
		allCategories: { 
			permalink: string 
			products: Product[] 
		}[]
  }
}

export type FPReturnObj = {
  skuCodes: string[]
  products: ChannableProduct[]
}

export interface FilterProducts {
  (response: DatoResponse): FPReturnObj
}

export interface AddPrices {
	(filterProducts: FPReturnObj): Promise<ChannableProduct[]>
}

export interface GetRange {
  (amountFloat: number, currencySymbol: string): string
}

type UpdateProductParams = {
  products: ChannableProduct[]
	price: PriceCollection
}

export interface UpdateProduct {
  (params: UpdateProductParams): ChannableProduct[] | null
}

export interface GetProductsXML {
	(products: ChannableProduct[]): string
}