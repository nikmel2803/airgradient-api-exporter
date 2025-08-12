import { register, Gauge, collectDefaultMetrics } from 'prom-client';

collectDefaultMetrics();

const port = Number(process.env.PORT) || 3000;

const airGradientMetrics = {
  pm01: new Gauge({
    name: 'airgradient_pm01_micrograms_per_cubic_meter',
    help: 'PM1.0 concentration in μg/m³',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  pm02: new Gauge({
    name: 'airgradient_pm02_micrograms_per_cubic_meter',
    help: 'PM2.5 concentration in μg/m³',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  pm10: new Gauge({
    name: 'airgradient_pm10_micrograms_per_cubic_meter',
    help: 'PM10 concentration in μg/m³',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  temperature: new Gauge({
    name: 'airgradient_temperature_celsius',
    help: 'Temperature in Celsius',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  humidity: new Gauge({
    name: 'airgradient_humidity_percent',
    help: 'Relative humidity in %',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  co2: new Gauge({
    name: 'airgradient_co2_ppm',
    help: 'CO2 concentration in ppm',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  tvoc: new Gauge({
    name: 'airgradient_tvoc_ppb',
    help: 'Total Volatile Organic Compounds in ppb',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  }),
  wifi: new Gauge({
    name: 'airgradient_wifi_signal_dbm',
    help: 'WiFi signal strength in dBm',
    labelNames: ['location_id', 'location_name', 'serial_no', 'model']
  })
};

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/metrics') {
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