import axios from 'axios'
import { FOOT_PRINT_API_KEY, FOOT_PRINT_BASE_URL } from '../configs/vars'

export default {
  get(apiUrl) {
    return axios.get(apiUrl, {
      auth: {
        username: 'any-user-name',
        password: FOOT_PRINT_API_KEY
      }
    })
  },

  // we can specify number of retries if needed
  // it's not required for this challenge
  async fetchWithRetry(url, retryWaitHeader) {
    try {
      return await this.get(url);
    } catch (error) {
      // check if the error is a rate limit error
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers[retryWaitHeader];
        // retry after the time specified in the response header or default to 1s
        const waitTime = retryAfter ? retryAfter * 1000 : 1000;

        // wait for waitTime
        await new Promise((res) => setTimeout(res, waitTime));

        return this.fetchWithRetry(url, retryWaitHeader);
      }
    }
    throw error;
  },

  // fetch all countries
  async getCountries() {
    const resp = await this.get(`${FOOT_PRINT_BASE_URL}countries`)
    return resp.data
  },

  // fetch a single country by countryCode
  async getDataForCountry(countryCode) {
    const resp = await this.fetchWithRetry(
      `${FOOT_PRINT_BASE_URL}data/${countryCode}/all/EFCpc`,
      "x-rate-limit-retry-after-seconds"  // this is the header returned by footprint network API
    );
    return resp.data;
  }, 
}