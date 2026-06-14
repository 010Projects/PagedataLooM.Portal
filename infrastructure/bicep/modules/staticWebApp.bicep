@description('Name of the Static Web App resource')
param appName string

@description('Azure region')
param location string = 'westeurope'

@description('SKU — Standard required for custom auth providers')
@allowed(['Free', 'Standard'])
param sku string = 'Standard'

@description('Tags')
param tags object = {}

resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: appName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    buildProperties: {
      appLocation: '/'
      outputLocation: 'dist'
    }
  }
}

output staticWebAppName string = staticWebApp.name
output defaultHostname string = staticWebApp.properties.defaultHostname
output deploymentToken string = listSecrets(staticWebApp.id, staticWebApp.apiVersion).properties.apiKey
