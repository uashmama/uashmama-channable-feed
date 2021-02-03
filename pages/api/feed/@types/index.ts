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
  }[]
  images?: {
    url: string
  }[]
}

export interface GoogleProduct {
  skuCode?: string
  id: string
  title: string
  description: string
  link: string
  imageLink: string
  availability: 'in stock' | 'out of stock' | 'preorder'
  price: {
    value: string
    currency: string
  }
  offerId: string
  contentLanguage: string
  targetCountry: string
  channel: 'online' | 'local'
  customLabel0: string
  customLabel1: string
  material: string
  condition: 'new'
  additionalImageLinks?: string[]
}

export type GooglePrice = {
  value: string
  currency: string
}

export type DatoResponse = {
  data: {
    allCategories: { products: Product[] }[]
  }
}

export type FPReturnObj = {
  skuCodes: string[]
  products: GoogleProduct[]
}

export interface FilterProducts {
  (response: DatoResponse): FPReturnObj
}

export interface AddPrices {
	(filterProducts: FPReturnObj): Promise<void | GoogleProduct[]>
}

export interface InsertOnGoogle {
  (googleToken: string, products: FPReturnObj['products']): void
}

export interface GetRange {
  (amountFloat: number, currencySymbol: string): string
}

type UpdateProductParams = {
  products: GoogleProduct[]
  singleProduct: PriceCollection
}

export interface UpdateProduct {
  (params: UpdateProductParams): GoogleProduct | null
}
