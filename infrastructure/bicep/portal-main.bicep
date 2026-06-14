@description('Environment: dev | prod')
param environment string = 'dev'

var appName = 'swa-pagedataloom-${environment}-weu'
var tags = {
  project: 'PagedataLooM'
  environment: environment
  component: 'portal'
}

module portal 'modules/staticWebApp.bicep' = {
  name: 'pagedataloom-portal'
  params: {
    appName: appName
    location: 'westeurope'
    sku: 'Standard'
    tags: tags
  }
}

output portalHostname string = portal.outputs.defaultHostname
output deploymentToken string = portal.outputs.deploymentToken
