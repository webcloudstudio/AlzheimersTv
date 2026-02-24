// Script to list all available streaming services from the API
import * as streamingAvailability from 'streaming-availability';
import { readFileSync } from 'fs';

const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

const client = new streamingAvailability.Client(
  new streamingAvailability.Configuration({
    apiKey: config.apiKey,
  })
);

async function listServices() {
  try {
    console.log('Fetching list of available streaming services for country:', config.country);
    console.log('='.repeat(80));

    // Get list of services for the US
    const usCountry = await client.countriesApi.getCountry({
      countryCode: config.country,
    });

    console.log('\nTotal services available:', usCountry.services.length);
    console.log('\n' + '='.repeat(80));
    console.log('Service ID'.padEnd(25), '|', 'Service Name'.padEnd(30), '|', 'Type');
    console.log('='.repeat(80));

    // Sort by name for easier reading
    const sortedServices = usCountry.services.sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    for (const service of sortedServices) {
      const hasSubscription = service.streamingOptionTypes.subscription;
      const hasFree = service.streamingOptionTypes.free;
      const types = [];

      if (hasSubscription) types.push('subscription');
      if (hasFree) types.push('free');
      if (service.streamingOptionTypes.rent) types.push('rent');
      if (service.streamingOptionTypes.buy) types.push('buy');
      if (service.streamingOptionTypes.addon) types.push('addon');

      console.log(
        service.id.padEnd(25),
        '|',
        service.name.padEnd(30),
        '|',
        types.join(', ')
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('\nRECOMMENDED SERVICES TO ADD:');
    console.log('='.repeat(80));

    const recommendedNames = [
      'paramount', 'peacock', 'showtime', 'amc', 'pbs',
      'apple', 'starz', 'mubi', 'criterion', 'britbox',
      'tubi', 'pluto', 'roku', 'crackle', 'vudu'
    ];

    for (const service of sortedServices) {
      const serviceLower = service.name.toLowerCase();
      const idLower = service.id.toLowerCase();

      for (const keyword of recommendedNames) {
        if (serviceLower.includes(keyword) || idLower.includes(keyword)) {
          const hasSubscription = service.streamingOptionTypes.subscription;
          const hasFree = service.streamingOptionTypes.free;

          console.log(`\n${service.name}`);
          console.log(`  ID: "${service.id}"`);
          console.log(`  Types: subscription=${hasSubscription}, free=${hasFree}`);
          console.log(`  Homepage: ${service.homePage}`);
          break;
        }
      }
    }

  } catch (error) {
    console.error('Error fetching services:', error);
  }
}

listServices();
