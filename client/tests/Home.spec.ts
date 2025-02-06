import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { describe, it, expect, vi } from 'vitest';
import Home from '../src/views/Home.vue';
import { useDataStore } from '../src/stores/dataStore';

const mockData = {
  2020: [
    { country: 'Country A', total: 100 },
    { country: 'Country B', total: 200 },
  ],
};

describe('Home.vue', () => {
  it('renders chart with countries and emissions after data is loaded', async () => {
    const pinia = createTestingPinia();
    const store = useDataStore();

    // Mock the store method
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

    // Check if the countries are rendered in the chart
    expect(wrapper.text()).toContain('Country A');
    expect(wrapper.text()).toContain('Country B');
  });
});
