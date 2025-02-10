import axios from "axios";
import assert from "assert";
import sinon from "sinon";
import footprintHelper from "../helpers/footprint.helper";

describe("Testing footprint helper methods", () => {
  let axiosStub;
  let clock;

  beforeEach(() => {
    axiosStub = sinon.stub(axios, "get");
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
    axiosStub.restore();
  });

  it("should retry on rate limit error", async () => {
    const expectedData = { data: [{ year: 2020, carbon: 5000 }] };

    // First call returns 429
    axiosStub.onFirstCall().rejects({
      response: {
        status: 429,
        headers: {
          "x-rate-limit-retry-after-seconds": 1,
        },
      },
    });

    // Second call succeeds
    axiosStub.onSecondCall().resolves(expectedData);

    const resultPromise = footprintHelper.getDataForCountry("test");
    await clock.runAllAsync();
    const result = await resultPromise;

    sinon.assert.calledTwice(axiosStub);
    assert.deepStrictEqual(result, expectedData.data);
  });

  it("should retry multiple times on rate limit errors", async () => {
    const expectedData = { data: [{ year: 2020, carbon: 5000 }] };

    // First two calls return 429
    axiosStub.onFirstCall().rejects({
      response: {
        status: 429,
        headers: {
          "x-rate-limit-retry-after-seconds": 1,
        },
      },
    });
    axiosStub.onSecondCall().rejects({
      response: {
        status: 429,
        headers: {
          "x-rate-limit-retry-after-seconds": 1,
        },
      },
    });

    // Third call succeeds
    axiosStub.onThirdCall().resolves(expectedData);

    // const result = await footprintHelper.getDataForCountry("test");
    const resultPromise = footprintHelper.getDataForCountry("test");
    await clock.runAllAsync();
    const result = await resultPromise;

    sinon.assert.calledThrice(axiosStub);
    assert.deepStrictEqual(result, expectedData.data);
  });
});
