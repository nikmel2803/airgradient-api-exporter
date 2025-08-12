import { register, Gauge } from 'prom-client';

const port = Number(process.env.PORT) || 3000;
const apiToken = process.env.AIRGRADIENT_API_TOKEN;

if (!apiToken) {
  console.error('❌ AIRGRADIENT_API_TOKEN environment variable is required');
  process.exit(1);
}

interface AirGradientData {
  locationId: number;
  locationName: string;
  pm01: number;
  pm02: number;
  pm10: number;
  pm003Count: number;
  atmp: number;
  rhum: number;
  rco2: number;
  atmp_corrected: number;
  rhum_corrected: number;
  rco2_corrected: number;
  tvoc: number;
  wifi: number;
  serialno: string;
  model: string;
  firmwareVersion: string;
  tvocIndex: number;
  noxIndex: number;
}

async function fetchAirGradientData(): Promise<AirGradientData[]> {
  try {
    const response = await fetch(`https://api.airgradient.com/public/api/v1/locations/measures/current?token=${apiToken}`, {
      headers: { 'accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json() as AirGradientData[];
  } catch (error) {
    console.error('❌ Failed to fetch AirGradient data:', error);
    throw error;
  }
}

function updateMetrics(data: AirGradientData[]) {
  for (const device of data) {
    const deviceType = device.model.includes('INDOOR') ? 'ONE_INDOOR' : 'OUTDOOR';

    airGradientMetrics.info.set(
      {
        airgradient_serial_number: device.serialno,
        airgradient_device_type: deviceType,
        airgradient_library_version: device.firmwareVersion
      },
      1
    );

    airGradientMetrics.configOk.set(1);
    airGradientMetrics.postOk.set(1);
    airGradientMetrics.wifiRssi.set(device.wifi);
    airGradientMetrics.pm1.set(device.pm01);
    airGradientMetrics.pm2d5.set(device.pm02);
    airGradientMetrics.pm10.set(device.pm10);
    airGradientMetrics.pm0d3.set(device.pm003Count);
    airGradientMetrics.tvocIndex.set(device.tvocIndex);
    airGradientMetrics.tvocRaw.set(device.tvoc);
    airGradientMetrics.noxIndex.set(device.noxIndex);
    airGradientMetrics.noxRaw.set(0);
    airGradientMetrics.co2.set(device.rco2);
    airGradientMetrics.temperature.set(device.atmp);
    airGradientMetrics.temperatureCompensated.set(device.atmp_corrected);
    airGradientMetrics.humidity.set(device.rhum);
    airGradientMetrics.humidityCompensated.set(device.rhum_corrected);
  }
}

const airGradientMetrics = {
  info: new Gauge({
    name: 'airgradient_info',
    help: 'AirGradient device information',
    labelNames: ['airgradient_serial_number', 'airgradient_device_type', 'airgradient_library_version']
  }),
  configOk: new Gauge({
    name: 'airgradient_config_ok',
    help: '1 if the AirGradient device was able to successfully fetch its configuration from the server'
  }),
  postOk: new Gauge({
    name: 'airgradient_post_ok',
    help: '1 if the AirGradient device was able to successfully send to the server'
  }),
  wifiRssi: new Gauge({
    name: 'airgradient_wifi_rssi_dbm',
    help: 'WiFi signal strength from the AirGradient device perspective, in dBm'
  }),
  pm1: new Gauge({
    name: 'airgradient_pm1_ugm3',
    help: 'PM1.0 concentration as measured by the AirGradient PMS sensor, in micrograms per cubic meter'
  }),
  pm2d5: new Gauge({
    name: 'airgradient_pm2d5_ugm3',
    help: 'PM2.5 concentration as measured by the AirGradient PMS sensor, in micrograms per cubic meter'
  }),
  pm10: new Gauge({
    name: 'airgradient_pm10_ugm3',
    help: 'PM10 concentration as measured by the AirGradient PMS sensor, in micrograms per cubic meter'
  }),
  pm0d3: new Gauge({
    name: 'airgradient_pm0d3_p100ml',
    help: 'PM0.3 concentration as measured by the AirGradient PMS sensor, in number of particules per 100 milliliters'
  }),
  tvocIndex: new Gauge({
    name: 'airgradient_tvoc_index',
    help: 'The processed Total Volatile Organic Compounds (TVOC) index as measured by the AirGradient SGP sensor'
  }),
  tvocRaw: new Gauge({
    name: 'airgradient_tvoc_raw',
    help: 'The raw input value to the Total Volatile Organic Compounds (TVOC) index as measured by the AirGradient SGP sensor'
  }),
  noxIndex: new Gauge({
    name: 'airgradient_nox_index',
    help: 'The processed Nitrous Oxide (NOx) index as measured by the AirGradient SGP sensor'
  }),
  noxRaw: new Gauge({
    name: 'airgradient_nox_raw',
    help: 'The raw input value to the Nitrous Oxide (NOx) index as measured by the AirGradient SGP sensor'
  }),
  co2: new Gauge({
    name: 'airgradient_co2_ppm',
    help: 'Carbon dioxide concentration as measured by the AirGradient S8 sensor, in parts per million'
  }),
  temperature: new Gauge({
    name: 'airgradient_temperature_celsius',
    help: 'The ambient temperature as measured by the AirGradient SHT / PMS sensor, in degrees Celsius'
  }),
  temperatureCompensated: new Gauge({
    name: 'airgradient_temperature_compensated_celsius',
    help: 'The compensated ambient temperature as measured by the AirGradient SHT / PMS sensor, in degrees Celsius'
  }),
  humidity: new Gauge({
    name: 'airgradient_humidity_percent',
    help: 'The relative humidity as measured by the AirGradient SHT sensor'
  }),
  humidityCompensated: new Gauge({
    name: 'airgradient_humidity_compensated_percent',
    help: 'The compensated relative humidity as measured by the AirGradient SHT / PMS sensor'
  })
};

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === '/metrics') {
      try {
        const data = await fetchAirGradientData();
        updateMetrics(data);
        airGradientMetrics.configOk.set(1);
        airGradientMetrics.postOk.set(1);
      } catch (error) {
        airGradientMetrics.configOk.set(0);
        airGradientMetrics.postOk.set(0);
      }

      return new Response(await register.metrics(), {
        headers: { 'Content-Type': register.contentType }
      });
    }

    if (url.pathname === '/health') {
      return new Response('OK');
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.log(`🚀 AirGradient Prometheus Exporter running on port ${port}`);
console.log(`📊 Metrics available at http://localhost:${port}/metrics`);
console.log(`❤️ Health check at http://localhost:${port}/health`);
