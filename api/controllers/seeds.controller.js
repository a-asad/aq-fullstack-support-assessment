import footprintApi from './../helpers/footprint.helper';
import { transformData, fetchData, sortByHighestTotal, fetchAndCacheData } from './../helpers/seeds.helper';
import { SKIPPED_COUNTRIES } from './../configs/vars';
import { EMISSIONS_CACHE_KEY, EMISSIONS_PROMISE_CACHE_KEY } from '../constants.js';
import cacheService from '../services/cache.js';

/**
 * Prepare emissions data by country.
 * 
 * Fetches data for all countries from the footprint API, processes it, and returns the results
 * 
 * @returns {Promise<Object>} The emissions data organized by country.
 */
export const prepareEmissionsByCountry = async () => {
  const dataByCountry = {};

  // Fetch all countries data from the footprint API
  const countries = await footprintApi.getCountries();

  const promises = []

  // Create a request for each country
  for (const country of countries) {
    const countryName = country.countryName.toLowerCase().trim();
    
    if (!SKIPPED_COUNTRIES.includes(countryName) && !dataByCountry[countryName]) {
      promises.push(fetchData(country.countryCode));
    }
  }

  let results = await Promise.allSettled(promises);

  results = results
    .filter(result => result.status === 'fulfilled' && result.value.length)
    .map(result => result.value);

  // Key by country name, transform and sort the data
  results.forEach(r => {
    const countryName = r[0].countryName.toLowerCase().trim()
    dataByCountry[countryName] = r;
  })

  let emissionsPerCountry = transformData(dataByCountry);
  emissionsPerCountry = await sortByHighestTotal(emissionsPerCountry);

  return emissionsPerCountry;
};


/**
 * Get emissions data by country.
 * 
 * Uses prepareEmissionsByCountry to get processed emission data, caches it and handles cache management.
 * 
 * @returns {Promise<Object>} The emissions data organized by country.
 */
export async function getEmissionsDataByCountry() {  
  // get existing data
  const cachedData = cacheService.getData(EMISSIONS_CACHE_KEY);
  const existingPromise = cacheService.getData(EMISSIONS_PROMISE_CACHE_KEY);
  
  // If data exists but invalid, trigger background refresh and return old data
  if (cachedData && !cacheService.isValid(EMISSIONS_CACHE_KEY)) {
    // if there's no in-flight promise, fetch new data
    if (!existingPromise) {
      fetchAndCacheData()
    }
    return cachedData;
  }

  // If valid data exists, return it
  if (cachedData) {
    return cachedData;
  }

  // If no data, check for in-flight promise
  if (existingPromise) {
    return existingPromise;
  }

  // Fetch new data
  return fetchAndCacheData();
}


/**
 * Preload emissions data into the cache.
 */
export const preloadEmissionsData = async () => {
  try {
    await fetchAndCacheData();
  } catch (error) {
    // log error to monitoring service
    console.error('Failed to preload emissions data');
  }
};