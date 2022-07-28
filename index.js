
import 'isomorphic-fetch'

import nscfDatasets from './nscfDatasets.js'
import { onlyUnique } from './lib.js'

const gbifDatasetDOIEndpoint = 'https://api.gbif.org/v1/dataset/doi/'
const searchDOI = '10.15468/zb6dtb'

const gbifLitSearch = "https://api.gbif.org/v1/literature/search"
const litSearchParam = "gbifDatasetKey"

async function getNSCFGBIFCitationCounts() {
  for (const [inst, datasets] of Object.entries(nscfDatasets)) {
    console.log('fetching data for', inst)
    for (const dataset of datasets) {
      //first fetch the dataset record so we can get its key
      console.log('fetching data for', dataset.dataset)
      const datasetURL = gbifDatasetDOIEndpoint + dataset.datasetID
      let response = await fetch(datasetURL)
      if (response.status >= 400) {
        throw new Error("Bad response fetching dataset record for", dataset.dataset);
      }
      
      let responsedata = await response.json()
      const datasetKey = responsedata.results[0].key

      //then fetch the citations using that key, and add them to each dataset record
      const limit = 1000
      let offset = 0
      let url = `${gbifLitSearch}?${litSearchParam}=${datasetKey}&limit=${limit}&offset=${offset}`
      let dois = []
      do {
        response = await fetch(url)
        if (response.status >= 400) {
          throw new Error("Bad response from server");
        }
        
        responsedata = await response.json()
        dois = [...dois, ...responsedata.results.map(x => x.identifiers.doi)]
        
      }
      while (!responsedata.endOfRecords)

      dataset.dois = dois

      
    }
  }

  //get the unique citations per institution
  let allDOIs = []
  for (const inst of Object.keys(nscfDatasets)) {
    const uniqueDOIs = nscfDatasets[inst].reduce((prev, curr) => [...prev, ...curr.dois], []).filter(onlyUnique)
    allDOIs = [...allDOIs, ...uniqueDOIs]
    console.log(`${inst}: ${uniqueDOIs.length} citations`)
  }

  console.log('Total unique citations:', allDOIs.filter(onlyUnique).length)

}

getNSCFGBIFCitationCounts().then(_ => console.log('all done!')).catch(err => console.error('Error:', err.message))
