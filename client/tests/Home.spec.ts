import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Home from '../src/views/Home.vue';
import { useDataStore } from '../src/stores/dataStore';

const mockData = {
  2020: [
    { country: 'Country A', total: 100 },
    { country: 'Country B', total: 200 },
  ],
  2021: [
    { country: 'Country A', total: 150 },
    { country: 'Country B', total: 250 },
  ],
};

describe('Testing Home.vue', () => {
  const setup = async () => {
    const pinia = createTestingPinia();
    const store = useDataStore();
    store.getAllEmissionData = vi.fn().mockResolvedValue(mockData);

    const wrapper = mount(Home, {
      global: {
        plugins: [pinia],
      },
    });

    // Wait for mounted hook and getData to complete
    await wrapper.vm.$nextTick();
    await wrapper.vm.getData();
    await wrapper.vm.$nextTick();

    return wrapper;
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders chart with countries and emissions after data is loaded', async () => {
    const wrapper = await setup();
    // Check if the countries are rendered in the chart
    expect(wrapper.text()).toContain('Country A');
    expect(wrapper.text()).toContain('Country B');
  });

  it('loops through years correctly', async () => {
    vi.useFakeTimers();
    const wrapper = await setup();

    expect(wrapper.vm.currentYear).toBe(2020);

    // Advance timer by 1 second
    vi.advanceTimersByTime(1000);
    expect(wrapper.vm.currentYear).toBe(2021);

    // Advance timer by 1 second - should loop back
    vi.advanceTimersByTime(1000);
    expect(wrapper.vm.currentYear).toBe(2020);

    vi.useRealTimers();
  });
});
