require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const ServiceCenter = require('../models/ServiceCenter');

const SERVICE_CENTERS = [
  // APPLE
  { brand:'Apple', name:'Apple Authorised Service - Unicorn (Chennai)',       address:'48, Chamiers Rd, Nandanam, Chennai 600035',           location:{ type:'Point', coordinates:[80.2561,13.0216] }, phone:'044-24310000' },
  { brand:'Apple', name:'Apple Authorised Service - Nungambakkam (Chennai)',  address:'12, Khader Nawaz Khan Rd, Nungambakkam, Chennai 600006', location:{ type:'Point', coordinates:[80.2446,13.0594] }, phone:'044-28220099' },
  { brand:'Apple', name:'Apple Authorised Service - MG Road (Bangalore)',     address:'48, Residency Rd, Shanthala Nagar, Bengaluru 560025', location:{ type:'Point', coordinates:[77.5968,12.9729] }, phone:'080-22110000' },
  { brand:'Apple', name:'Apple Authorised Service - Bandra (Mumbai)',         address:'Shop 4, Linking Rd, Bandra West, Mumbai 400050',      location:{ type:'Point', coordinates:[72.8347,19.0596] }, phone:'022-26404040' },
  { brand:'Apple', name:'Apple Authorised Service - Connaught Place (Delhi)', address:'N-18, Connaught Place, New Delhi 110001',             location:{ type:'Point', coordinates:[77.2167,28.6315] }, phone:'011-43501234' },
  { brand:'Apple', name:'Apple Authorised Service - Banjara Hills (Hyderabad)',address:'6-3-1192, Road 12, Banjara Hills, Hyderabad 500034',  location:{ type:'Point', coordinates:[78.4483,17.4194] }, phone:'040-66100000' },

  // SAMSUNG
  { brand:'Samsung', name:'Samsung Service Centre - Anna Nagar (Chennai)',    address:'67, 13th Main Rd, Anna Nagar West, Chennai 600040',   location:{ type:'Point', coordinates:[80.2103,13.0850] }, phone:'1800-5-7267864' },
  { brand:'Samsung', name:'Samsung Service Centre - T Nagar (Chennai)',       address:'43, Pondy Bazaar, T Nagar, Chennai 600017',           location:{ type:'Point', coordinates:[80.2330,13.0401] }, phone:'1800-5-7267864' },
  { brand:'Samsung', name:'Samsung Service Centre - Koramangala (Bangalore)', address:'80 Feet Rd, 6th Block, Koramangala, Bengaluru 560095',location:{ type:'Point', coordinates:[77.6255,12.9352] }, phone:'1800-5-7267864' },
  { brand:'Samsung', name:'Samsung Service Centre - Andheri (Mumbai)',        address:'Plot 106, MIDC, Andheri East, Mumbai 400093',         location:{ type:'Point', coordinates:[72.8479,19.1197] }, phone:'1800-5-7267864' },
  { brand:'Samsung', name:'Samsung Service Centre - Lajpat Nagar (Delhi)',    address:'24, Ring Rd, Lajpat Nagar II, New Delhi 110024',      location:{ type:'Point', coordinates:[77.2428,28.5651] }, phone:'1800-5-7267864' },

  // LG
  { brand:'LG', name:'LG Service Centre - Adyar (Chennai)',       address:'21, 4th Main Rd, Kasturba Nagar, Adyar, Chennai 600020', location:{ type:'Point', coordinates:[80.2535,13.0012] }, phone:'1800-315-9999' },
  { brand:'LG', name:'LG Service Centre - Velachery (Chennai)',   address:'142, Taramani Link Rd, Velachery, Chennai 600042',       location:{ type:'Point', coordinates:[80.2209,12.9786] }, phone:'1800-315-9999' },
  { brand:'LG', name:'LG Service Centre - Jayanagar (Bangalore)', address:'11th Cross, 4th Block, Jayanagar, Bengaluru 560041',    location:{ type:'Point', coordinates:[77.5855,12.9250] }, phone:'1800-315-9999' },
  { brand:'LG', name:'LG Service Centre - Dwarka (Delhi)',        address:'Sector 10, Dwarka, New Delhi 110075',                   location:{ type:'Point', coordinates:[77.0459,28.5832] }, phone:'1800-315-9999' },

  // SONY
  { brand:'Sony', name:'Sony Service Centre - Velachery (Chennai)',    address:'100 Feet Rd, Velachery, Chennai 600042',                  location:{ type:'Point', coordinates:[80.2209,12.9790] }, phone:'1800-103-7799' },
  { brand:'Sony', name:'Sony Service Centre - Indiranagar (Bangalore)',address:'100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru 560038',location:{ type:'Point', coordinates:[77.6413,12.9716] }, phone:'1800-103-7799' },
  { brand:'Sony', name:'Sony Service Centre - Grant Road (Mumbai)',    address:'185, Ground Floor, Grant Rd, Mumbai 400007',             location:{ type:'Point', coordinates:[72.8225,18.9643] }, phone:'1800-103-7799' },
  { brand:'Sony', name:'Sony Service Centre - Nehru Place (Delhi)',    address:'10, Nehru Place, New Delhi 110019',                      location:{ type:'Point', coordinates:[77.2519,28.5489] }, phone:'1800-103-7799' },

  // BOSCH
  { brand:'Bosch', name:'Bosch Service Centre - Guindy (Chennai)',         address:'36, Mount-Poonamallee Rd, Guindy, Chennai 600032',    location:{ type:'Point', coordinates:[80.2127,13.0121] }, phone:'1860-267-5555' },
  { brand:'Bosch', name:'Bosch Appliance Service - Whitefield (Bangalore)',address:'EPIP Zone, Whitefield, Bengaluru 560066',             location:{ type:'Point', coordinates:[77.7480,12.9698] }, phone:'1860-267-5555' },
  { brand:'Bosch', name:'Bosch Service - Powai (Mumbai)',                  address:'IIT Area, Powai, Mumbai 400076',                      location:{ type:'Point', coordinates:[72.9051,19.1177] }, phone:'1860-267-5555' },

  // WHIRLPOOL
  { brand:'Whirlpool', name:'Whirlpool Service Centre - Porur (Chennai)',       address:'187, MTH Rd, Porur, Chennai 600116',             location:{ type:'Point', coordinates:[80.1576,13.0378] }, phone:'1800-208-1800' },
  { brand:'Whirlpool', name:'Whirlpool Service - Rajajinagar (Bangalore)',      address:'4th Block, Rajajinagar, Bengaluru 560010',       location:{ type:'Point', coordinates:[77.5557,12.9901] }, phone:'1800-208-1800' },
  { brand:'Whirlpool', name:'Whirlpool Service - Malad (Mumbai)',               address:'Malad West, Mumbai 400064',                     location:{ type:'Point', coordinates:[72.8443,19.1865] }, phone:'1800-208-1800' },
  { brand:'Whirlpool', name:'Whirlpool Service - Rohini (Delhi)',               address:'Sector 14, Rohini, New Delhi 110085',           location:{ type:'Point', coordinates:[77.0966,28.7156] }, phone:'1800-208-1800' },

  // ONEPLUS
  { brand:'OnePlus', name:'OnePlus Service - Velachery (Chennai)',   address:'Phoenix Market City, Velachery, Chennai 600042',       location:{ type:'Point', coordinates:[80.2179,12.9775] }, phone:'1800-102-8411' },
  { brand:'OnePlus', name:'OnePlus Service - Indiranagar (Bangalore)',address:'CMH Rd, Indiranagar, Bengaluru 560038',               location:{ type:'Point', coordinates:[77.6416,12.9710] }, phone:'1800-102-8411' },
  { brand:'OnePlus', name:'OnePlus Service - Lower Parel (Mumbai)',  address:'High Street Phoenix, Lower Parel, Mumbai 400013',     location:{ type:'Point', coordinates:[72.8265,18.9965] }, phone:'1800-102-8411' },

  // XIAOMI
  { brand:'Xiaomi', name:'Mi Service Centre - Ambattur (Chennai)',      address:'14, MTH Rd, Ambattur Industrial Estate, Chennai 600058', location:{ type:'Point', coordinates:[80.1567,13.0975] }, phone:'1800-103-6286' },
  { brand:'Xiaomi', name:'Mi Service Centre - Electronic City (Bangalore)',address:'Phase 1, Electronic City, Bengaluru 560100',          location:{ type:'Point', coordinates:[77.6791,12.8449] }, phone:'1800-103-6286' },
  { brand:'Xiaomi', name:'Mi Service Centre - Goregaon (Mumbai)',       address:'NESCO Complex, Goregaon East, Mumbai 400063',           location:{ type:'Point', coordinates:[72.8536,19.1557] }, phone:'1800-103-6286' },

  // DELL
  { brand:'Dell', name:'Dell Authorised Service - Perungudi (Chennai)',       address:'SP Infocity, Perungudi, Chennai 600096',               location:{ type:'Point', coordinates:[80.2394,12.9648] }, phone:'1800-425-4026' },
  { brand:'Dell', name:'Dell Service Centre - Manyata Tech Park (Bangalore)', address:'Outer Ring Rd, Nagawara, Bengaluru 560045',            location:{ type:'Point', coordinates:[77.6328,13.0556] }, phone:'1800-425-4026' },

  // HP
  { brand:'HP', name:'HP Authorised Service - Sholinganallur (Chennai)', address:'OMR, Sholinganallur, Chennai 600119',                   location:{ type:'Point', coordinates:[80.2274,12.9014] }, phone:'1800-425-5005' },
  { brand:'HP', name:'HP Service Centre - Koramangala (Bangalore)',      address:'80 Feet Rd, 7th Block, Koramangala, Bengaluru 560095', location:{ type:'Point', coordinates:[77.6261,12.9280] }, phone:'1800-425-5005' },
];

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('MongoDB connected');
  await ServiceCenter.deleteMany({});
  const inserted = await ServiceCenter.insertMany(SERVICE_CENTERS);
  console.log(`✅ Inserted ${inserted.length} service centers`);
  await mongoose.disconnect();
})().catch(err => { console.error(err); process.exit(1); });