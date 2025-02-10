import { prepareEmissionsByCountry } from '../controllers/seeds.controller';
import footprintApi from './../helpers/footprint.helper';
import cacheService from '../services/cache.js';
import {
  EMISSIONS_CACHE_KEY,
  EMISSIONS_PROMISE_CACHE_KEY,
} from "../constants.js";

/**
 * Transform input data by organizing it by year.
 * 
 * @param {Object} inputData - The raw input data organized by country.
 * @returns {Object} The transformed data organized by year.
 */
export const transformData = (inputData) => {
  const dataByYear = {};

  // Iterate through each country in the input data
  for (const country in inputData) {
    inputData[country].forEach(record => {
      const year = record.year;
      const total = parseFloat(record.carbon.toFixed(4));

      // Initialize the year if it doesn't exist in dataByYear
      if (!dataByYear[year]) {
        dataByYear[year] = [];
      }

      // Add the country and total to the corresponding year
      if (total) {
        dataByYear[year].push({ country, total });
      }
    });
  }

  return dataByYear;
};

/**
 * Fetch data for a country
 * 
 * @param {string} countryCode - The country code to fetch data for.
 * @returns {Promise<Object>} The data for the specified country.
 */
export const fetchData = async (countryCode) => {
  return await footprintApi.getDataForCountry(countryCode);
};

/**
 * Sort data by highest total emissions.
 * 
 * @param {Object} data - The data organized by year.
 * @returns {Object} The data sorted by highest total emissions per year.
 */
export const sortByHighestTotal = async (data) => {
  for (let year in data) {
    data[year].sort((a, b) => b.total - a.total);
  }
  return data;
};

/**
 * Fetch emission data by contry and cache it.
 * 
 * @returns {Object} The promise that resolves to the emissions data organized by country.
 */
export const fetchAndCacheData = async () => {
  const fetchPromise = prepareEmissionsByCountry().then((data) => {
    // store data in cache
    cacheService.setData(EMISSIONS_CACHE_KEY, data);
    return data;
  });
  // store the promise for API calls when data is being fetched and return this same
  // promise instead of making new API calls to the footprint network API
  cacheService.setPromise(EMISSIONS_PROMISE_CACHE_KEY, fetchPromise);
  return fetchPromise;
};
