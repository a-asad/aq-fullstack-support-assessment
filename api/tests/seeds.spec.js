import assert from 'assert';
import sinon from 'sinon';
import * as seedsHelper from '../helpers/seeds.helper';
import footprintApi from '../helpers/footprint.helper';
import * as seedsController from '../controllers/seeds.controller';
import cacheService from "../services/cache";
import {
  EMISSIONS_CACHE_KEY,
  EMISSIONS_PROMISE_CACHE_KEY,
} from "../constants.js";

describe('Testing emissions controller and helper functions', function() {
  this.timeout(10); // Increase timeout to 30 seconds

  let footprintApiStub;
  let fetchDataStub;

  beforeEach(() => {
    footprintApiStub = sinon.stub(footprintApi, 'getCountries');
    fetchDataStub = sinon.stub(footprintApi, 'getDataForCountry');
    // Reset cache before each test
    cacheService.clear();
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should prepare emissions data by country', async () => {
    const countriesMock = [
      {
        "score": "3A",
        "shortName": "Armenia",
        "countryCode": "1",
        "countryName": "Armenia",
        "isoa2": "AM"
      },
      {
        "score": "3A",
        "shortName": "Afghanistan",
        "countryCode": "2",
        "countryName": "Afghanistan",
        "isoa2": "AF"
      }
    ];
    const dataMock = [
      { year: 2020, carbon: 5000, countryName: "Afghanistan" },
      { year: 2021, carbon: 6000, countryName: "Armenia" }
    ];

    footprintApiStub.resolves(countriesMock);
    fetchDataStub.resolves(dataMock);

    const testPromise = seedsController.prepareEmissionsByCountry();
    
    await testPromise;

    assert(footprintApiStub.calledOnce);
    assert(fetchDataStub.calledTwice); // Called for each country in countriesMock
  });

  it('should not fetch data for skipped countries', async () => {
    const countriesMock = [
      {
        "score": "3A",
        "shortName": "Armenia",
        "countryCode": "1",
        "countryName": "Armenia",
        "isoa2": "AM"
      },
      {
        "score": "3A",
        "shortName": "all",
        "countryCode": "2",
        "countryName": "all",
        "isoa2": "all"
      }
    ];
    const dataMock = [
      { year: 2020, carbon: 5000, countryName: "Afghanistan" },
      { year: 2021, carbon: 6000, countryName: "Armenia" }
    ];

    footprintApiStub.resolves(countriesMock);
    fetchDataStub.resolves(dataMock);

    const testPromise = seedsController.prepareEmissionsByCountry();
    
    await testPromise;

    assert(footprintApiStub.calledOnce);
    assert(fetchDataStub.calledOnce); // Only one call because one country is skipped
  });

  it('should transform data correctly', () => {
    const inputData = {
      armenia: [
        { year: 2020, carbon: 5000.1234 },
        { year: 2021, carbon: 6000.5678 }
      ],
      afghanistan: [
        { year: 2020, carbon: 3000.1234 },
        { year: 2021, carbon: 4000.5678 }
      ]
    };

    const expectedOutput = {
      2020: [
        { country: 'armenia', total: 5000.1234 },
        { country: 'afghanistan', total: 3000.1234 }
      ],
      2021: [
        { country: 'armenia', total: 6000.5678 },
        { country: 'afghanistan', total: 4000.5678 }
      ]
    };

    const result = seedsHelper.transformData(inputData);
    assert.deepStrictEqual(result, expectedOutput);
  });

  it('should fetch data', async () => {
    fetchDataStub.resolves({ year: 2020, carbon: 5000 });

    const testPromise = seedsHelper.fetchData('AM');
    const result = await testPromise;

    assert(fetchDataStub.calledOnce);
    assert(result.year === 2020 && result.carbon === 5000);
  });

  it('should sort data by highest total', async () => {
    const inputData = {
      2020: [
        { country: 'armenia', total: 5000 },
        { country: 'afghanistan', total: 3000 }
      ],
      2021: [
        { country: 'armenia', total: 6000 },
        { country: 'afghanistan', total: 4000 }
      ]
    };

    const expectedOutput = {
      2020: [
        { country: 'armenia', total: 5000 },
        { country: 'afghanistan', total: 3000 }
      ],
      2021: [
        { country: 'armenia', total: 6000 },
        { country: 'afghanistan', total: 4000 }
      ]
    };

    const result = await seedsHelper.sortByHighestTotal(inputData);
    assert.deepStrictEqual(result, expectedOutput);
  });

  it("should return cached data when available and valid", async () => {
    const mockData = { test: "data" };
    cacheService.setData(EMISSIONS_CACHE_KEY, mockData);

    const result = await seedsController.getEmissionsDataByCountry();
    assert.deepStrictEqual(result, mockData);
  });

  it("should return stale data and trigger refresh when cache is invalid", async () => {
    const staleData = { stale: "data" };

    // Set stale data with old timestamp
    cacheService.data.set(EMISSIONS_CACHE_KEY, {
      data: staleData,
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours old
    });

    footprintApiStub.resolves([]);
    fetchDataStub.resolves([]);

    const result = await seedsController.getEmissionsDataByCountry();
    // should return old data as request is being processed in the background
    assert.deepStrictEqual(result, staleData);

    // resolve the pending promise
    await cacheService.getData(EMISSIONS_PROMISE_CACHE_KEY);
    // get new data from the API
    const newResult = await seedsController.getEmissionsDataByCountry();

    // new result sould match the updated cache
    const cachedData = cacheService.getData(EMISSIONS_CACHE_KEY);
    assert.deepStrictEqual(cachedData, newResult);
  });

  it("should handle concurrent requests during data fetch", async () => {
    const mockData = { test: "data" };
    const fetchPromise = Promise.resolve(mockData);
    cacheService.setPromise(EMISSIONS_PROMISE_CACHE_KEY, fetchPromise);

    const results = await Promise.all([
      seedsController.getEmissionsDataByCountry(),
      seedsController.getEmissionsDataByCountry(),
      seedsController.getEmissionsDataByCountry(),
    ]);

    results.forEach((result) => {
      assert.deepStrictEqual(result, mockData);
    });
  });

  it("should preload data on server start", async () => {
    const countriesMock = [
      {
        score: "3A",
        shortName: "Armenia",
        countryCode: "1",
        countryName: "Armenia",
        isoa2: "AM",
      },
    ];
    const dataMock = [{ year: 2021, carbon: 6000, countryName: "Armenia" }];

    footprintApiStub.resolves(countriesMock);
    fetchDataStub.resolves(dataMock);

    await seedsController.preloadEmissionsData();
    // Check if data is cached and valid
    assert.ok(cacheService.getData(EMISSIONS_CACHE_KEY));
    assert.ok(cacheService.isValid(EMISSIONS_CACHE_KEY));
  });
});
