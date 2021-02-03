# Uashmama - Channable feed xml generator

This procedure, built with *Next.JS* and *typescript*, aims to:
* collect all the products' data from Uashmama's DatoCMS API
* connect with CommerceLayer API and add the products' prices related to products' SKUs
* create a xml output compliant with [Channable rules for import files](https://helpcenter.channable.com/hc/en-us/articles/360011048779-Which-fields-do-I-need-in-my-own-import-file-)

## Testing & developing locally

Launch the following command to start **next** client in local machine and test the feed procedure:

`$ npx next`

Then browse to the local test link:

`http://localhost:3000/api/feed/startProcess`
