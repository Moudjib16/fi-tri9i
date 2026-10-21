// Reference data for the 58 Algerian wilayas and their main communes.
// Communes are only suggestions: the commune field stays free text so a
// missing entry never blocks a trip, while the wilaya is validated.
const WILAYAS = [
  {
    code: '01', name: 'Adrar', ar: 'أدرار', lat: 27.8743, lon: -0.2939,
    communes: ['Adrar', 'Reggane', 'Sidi Amrane', 'Tsabit', 'Aougrout', 'Tamtert', 'Timiaouine', 'In El Meskine'],
  },
  {
    code: '02', name: 'Chlef', ar: 'الشلف', lat: 36.1653, lon: 1.3345,
    communes: ['Chlef', 'Oued Fodha', 'Bouzaria', 'El Kari', 'Kherracha', 'Tadjra', 'Oued Souss', 'Sidi Abdelkader', 'Herraoua', 'Zerouabia'],
  },
  {
    code: '03', name: 'Laghouat', ar: 'الأغواط', lat: 33.8, lon: 2.8651,
    communes: ['Laghouat', 'Ksar Hirane', 'Beidja', 'Brida', 'El Ghicha', 'Hassi Delaa', 'Aflou', 'Oued Morba', 'Sidi Makhlouf'],
  },
  {
    code: '04', name: 'Oum El Bouaghi', ar: 'أم البواقي', lat: 35.8753, lon: 7.1136,
    communes: ['Oum El Bouaghi', 'Aïn Beïda', 'Sigus', 'El Amiria', 'Aïn M’lila', 'Meskiana', 'Oued Nini', 'Fkirina', 'Berriche', 'Ouled Hamla'],
  },
  {
    code: '05', name: 'Batna', ar: 'باتنة', lat: 35.5559, lon: 6.1741,
    communes: ['Batna', 'Barika', 'Arris', 'Tigherghar', 'Ras El Aioun', 'Aïn Touta', 'N’Gour', 'Bouarek', 'Tala Hamza'],
  },
  {
    code: '06', name: 'Béjaïa', ar: 'بجاية', lat: 36.7509, lon: 5.0567,
    communes: ['Béjaïa', 'Akbou', 'Amizour', 'Boghni', 'El Kseur', 'Khemra', 'Sidi Aïch', 'Tizi N’Berber', 'Souk El Tenine', 'Bounouh', 'Aït Maouche', 'Sidi Salem'],
  },
  {
    code: '07', name: 'Biskra', ar: 'بسكرة', lat: 34.85, lon: 5.7333,
    communes: ['Biskra', 'Tolga', 'Zaboussa', 'Ferkhani', 'El Kantara', 'M’Chouneche', 'Meziane', 'Branis'],
  },
  {
    code: '08', name: 'Béchar', ar: 'بشار', lat: 31.6167, lon: -2.2167,
    communes: ['Béchar', 'Abdelkader', 'Ksar Kenadra', 'Mougheul', 'Taghit', 'Boudjedra', 'Sidi Labdar', 'M’dourab'],
  },
  {
    code: '09', name: 'Blida', ar: 'البليدة', lat: 36.47, lon: 2.83,
    communes: ['Blida', 'Boufarik', 'Larbaâ', 'Oued El Alleug', 'Bouinan', 'Ouled Yaïch', 'Ben Khelil', 'Soumaa', 'Chiffa', 'Mouzaïa'],
  },
  {
    code: '10', name: 'Bouira', ar: 'البويرة', lat: 36.3739, lon: 3.9022,
    communes: ['Bouira', 'Sour El Ghozlane', 'Sidi Mubarak', 'El Mokrani', 'Behlil', 'Choraga', 'Hasana', 'Theniet En Nasr'],
  },
  {
    code: '11', name: 'Tamanrasset', ar: 'تمنراست', lat: 22.785, lon: 5.5228,
    communes: ['Tamanrasset', 'In Guezzam', 'Tin Zaouatine', 'Abane Ramdane', 'Tafidet', 'Thalaouine'],
  },
  {
    code: '12', name: 'Tébessa', ar: 'تبسة', lat: 35.4042, lon: 8.1242,
    communes: ['Tébessa', 'El Hochra', 'Bir El Djir', 'El Maadher', 'El Ogla', 'Thelep', 'Cheraga', 'Hanchir Toumghani'],
  },
  {
    code: '13', name: 'Tlemcen', ar: 'تلمسان', lat: 34.8828, lon: -1.315,
    communes: ['Tlemcen', 'Mansourah', 'Chouaïef', 'Nedroma', 'M’sir Ben Mara', 'Ghazaouet', 'Maghna', 'Hammam Bou Khadid', 'Beni Snous'],
  },
  {
    code: '14', name: 'Tiaret', ar: 'تيارت', lat: 35.3711, lon: 1.317,
    communes: ['Tiaret', 'Frenda', 'Sougueur', 'Mahdia', 'Nador', 'Taourt', 'Amouchas', 'Takriza'],
  },
  {
    code: '15', name: 'Tizi Ouzou', ar: 'تيزي وزو', lat: 36.7118, lon: 4.0458,
    communes: ['Tizi Ouzou', 'Azazga', 'Draâ Ben Khedda', 'Bounouh', 'Iferhounène', 'Aïn Lechiakh', 'Mekhadma', 'Aït Mahmoud', 'Tizi Ras', 'Illilten'],
  },
  {
    code: '16', name: 'Alger', ar: 'الجزائر', lat: 36.7538, lon: 3.0588,
    communes: ['Alger', 'Bab Ezzouar', 'Birkhadem', 'Bologhine', 'El Harrach', 'Kouba', 'Hydra', 'El Biar', 'Béchardja', 'Bir Mourad Raïs', 'Chéraga', 'Dely Ibrahim', 'El Mouradia', 'Aïn Benian', 'Dar El Beïda'],
  },
  {
    code: '17', name: 'Djelfa', ar: 'الجلفة', lat: 34.6703, lon: 3.263,
    communes: ['Djelfa', 'Aïn Oussera', 'Messaâda', 'Sidi Amar', 'Hassi Bahdach', 'Zeribba', 'Idles Dehez', 'Beni Tamou'],
  },
  {
    code: '18', name: 'Jijel', ar: 'جيجل', lat: 36.821, lon: 5.7667,
    communes: ['Jijel', 'El Akhdar', 'Chebara', 'El Milia', 'Tahanna', 'Ziama', 'Bordj Thar', 'El Aouja', 'Ouled Aïssa'],
  },
  {
    code: '19', name: 'Sétif', ar: 'سطيف', lat: 36.19, lon: 5.41,
    communes: ['Sétif', 'Aïn Arnat', 'El Eulma', 'Bougaa', 'Bordj Ghedir', 'Hassi Messaoud', 'Aïn Sebt', 'Maaï', 'El Maïn'],
  },
  {
    code: '20', name: 'Saïda', ar: 'سعيدة', lat: 34.8303, lon: 0.1517,
    communes: ['Saïda', 'Aïn El Hadjar', 'Oued Sâdi', 'Sidi Boubakeur', 'Moulay Belkacem', 'Youcef', 'El Hachimia'],
  },
  {
    code: '21', name: 'Skikda', ar: 'سكيكدة', lat: 36.8762, lon: 6.9094,
    communes: ['Skikda', 'El Hattab', 'Ben Thour', 'Ouled Zouaï', 'Behir Chergui', 'Zorg', 'El Meskine', 'Bena Azziz'],
  },
  {
    code: '22', name: 'Sidi Bel Abbès', ar: 'سيدي بلعباس', lat: 35.1878, lon: -0.6308,
    communes: ['Sidi Bel Abbès', 'Sidi Ali Ben Youb', 'Sfizig', 'Mostefa Ben Boulaïd', 'Béni Badis', 'Sidi Brahim', 'Tessen', 'Merad'],
  },
  {
    code: '23', name: 'Annaba', ar: 'عنابة', lat: 36.9, lon: 7.7667,
    communes: ['Annaba', 'El Bouni', 'Sidi Amar', 'Boussem', 'Chelghoum Laïd', 'Thia', 'El Hadjar', 'Sidi M’hamed'],
  },
  {
    code: '24', name: 'Guelma', ar: 'قالمة', lat: 36.4611, lon: 7.4261,
    communes: ['Guelma', 'Oued El Ma', 'Bouhennat', 'Pensive', 'Hammam Soukhan', 'Bou Hikrane', 'Kouma', 'Medeana'],
  },
  {
    code: '25', name: 'Constantine', ar: 'قسنطينة', lat: 36.365, lon: 6.6147,
    communes: ['Constantine', 'El Khroub', 'Zouaghi', 'Birk Rostane', 'Sidi Mabrouk', 'Hussein Dey', 'Ben Badis', 'Oued Zgar', 'Aïn Smara'],
  },
  {
    code: '26', name: 'Médéa', ar: 'المدية', lat: 36.2675, lon: 2.7539,
    communes: ['Médéa', 'Berrouaghia', 'Ouzera', 'El Omaria', 'Ksar Boukhari', 'Beni Slimane', 'Aïn Boucif', 'Sidi Naamane', 'Chahbounia'],
  },
  {
    code: '27', name: 'Mostaganem', ar: 'مستغانم', lat: 35.9315, lon: 0.0894,
    communes: ['Mostaganem', 'Sidi Ali', 'Bougraâ', 'Hassi M’Hidi', 'Tighnif', 'Sirat', 'Mesghert', 'Kerrouana'],
  },
  {
    code: '28', name: 'M’Sila', ar: 'المسيلة', lat: 35.705, lon: 4.542,
    communes: ['M’Sila', 'Bou Saâda', 'Sidi Aïssa', 'M’Hamid', 'Koudia', 'Slim', 'Ouled Sidi M’hamed', 'Beni Errabia'],
  },
  {
    code: '29', name: 'Mascara', ar: 'معسكر', lat: 35.3968, lon: 0.14,
    communes: ['Mascara', 'Tighennif', 'Boudoua', 'Ghriss', 'Sidi Aïssa', 'El Moulai', 'Oued El Abtal', 'M’Hamed'],
  },
  {
    code: '30', name: 'Ouargla', ar: 'ورقلة', lat: 31.9539, lon: 5.3333,
    communes: ['Ouargla', 'El Alia', 'Hassi Messaoud', 'Tebesbest', 'Nezla', 'Sidi Slimane', 'Hassi Fehal', 'Taibet'],
  },
  {
    code: '31', name: 'Oran', ar: 'وهران', lat: 35.6971, lon: -0.6308,
    communes: ['Oran', 'Es Sénia', 'Bir El Djir', 'Bedia', 'El Kerma', 'Aïn El Turk', 'Sidi El Bachir', 'Mansourah', 'Bousfer', 'Arzew', 'M’Pila'],
  },
  {
    code: '32', name: 'El Bayadh', ar: 'البيضاض', lat: 33.6833, lon: 1.0333,
    communes: ['El Bayadh', 'Bougzoul', 'El Assafia', 'GhassTouria', 'Kerroucha', 'Labiodh Sidi Cheikh', 'Sidi Brahim', 'Chellala'],
  },
  {
    code: '33', name: 'Illizi', ar: 'إليزي', lat: 26.4833, lon: 8.4667,
    communes: ['Illizi', 'In Amenas', 'Djanet', 'Bordj El Haouas', 'El Golea'],
  },
  {
    code: '34', name: 'Bordj Bou Arréridj', ar: 'برج بوعريريج', lat: 36.0731, lon: 4.7608,
    communes: ['Bordj Bou Arréridj', 'Bordj Ghedir', 'M’Bouraïda', 'Ras El Oued', 'Mansoura', 'El Annaba', 'Sidi Aïch', 'Bordj Tighrad'],
  },
  {
    code: '35', name: 'Boumerdès', ar: 'بومرداس', lat: 36.7667, lon: 3.4772,
    communes: ['Boumerdès', 'Delga', 'Sidi M’hamed', 'Saâda', 'Kef Lakhdar', 'Bordj El Bahri', 'Isser', 'Charbouné'],
  },
  {
    code: '36', name: 'El Tarf', ar: 'الطارف', lat: 36.7672, lon: 8.3136,
    communes: ['El Tarf', 'El Kala', 'Boutlelis', 'Ouled Gacem', 'Bouchtoub', 'Souriane', 'Zitouna', 'Fetzoua'],
  },
  {
    code: '37', name: 'Tindouf', ar: 'تندوف', lat: 27.6742, lon: -8.1478,
    communes: ['Tindouf', 'Oum Elessel'],
  },
  {
    code: '38', name: 'Tissemsilt', ar: 'تيسمسيلت', lat: 35.6072, lon: 1.8106,
    communes: ['Tissemsilt', 'Theniet El Hadjar', 'Lal Clinic', 'Aïn Deheb', 'Sidi Larbi', 'Oued El Maden', 'Bordj Lakhdar'],
  },
  {
    code: '39', name: 'El Oued', ar: 'الوادي', lat: 33.3683, lon: 6.8675,
    communes: ['El Oued', 'Guemar', 'El Alia', 'Hammam Dhalaa', 'Djamaa', 'M’Consa', 'Taghzaiet', 'Sidi Amrane'],
  },
  {
    code: '40', name: 'Khenchela', ar: 'خنشلة', lat: 35.4361, lon: 7.1436,
    communes: ['Khenchela', 'Kaïs', 'Chahia', 'Zabad', 'Remchi', 'Dahra', 'Taïbara'],
  },
  {
    code: '41', name: 'Souk Ahras', ar: 'سوق أهراس', lat: 36.2864, lon: 7.9511,
    communes: ['Souk Ahras', 'Mechraâ', 'Madragh', 'Ouled Driss', 'Taoura', 'Bîr Bou Aqqous', 'Zouagha', 'Hannibal'],
  },
  {
    code: '42', name: 'Tipaza', ar: 'تيبازة', lat: 36.5892, lon: 2.4483,
    communes: ['Tipaza', 'Cherchell', 'Bou Ismail', 'Sidi Amar', 'Fouaga', 'Dourdis', 'Hadjout', 'Sidi M’hamed'],
  },
  {
    code: '43', name: 'Mila', ar: 'ميلة', lat: 36.45, lon: 6.2647,
    communes: ['Mila', 'Chelghoum Laïd', 'Ferdji', 'Rached', 'Tessala El Merdja', 'Ouled M’Lila', 'Slim', 'Zerdouna'],
  },
  {
    code: '44', name: 'Aïn Defla', ar: 'عين الدفلى', lat: 36.2639, lon: 1.9678,
    communes: ['Aïn Defla', 'Miliana', 'Bir Ben Laabed', 'Rouïba', 'El Milia', 'Mezerana', 'Oued El Alleug'],
  },
  {
    code: '45', name: 'Naâma', ar: 'النعامة', lat: 33.2667, lon: -0.3167,
    communes: ['Naâma', 'M’sâna', 'Aïn Séfra', 'Tiout', 'Mechria', 'Sfizig', 'Aïn Ben Amar'],
  },
  {
    code: '46', name: 'Aïn Témouchent', ar: 'عين تموشنت', lat: 35.2989, lon: -1.14,
    communes: ['Aïn Témouchent', 'Témouchent', 'Ouled Aïssa', 'Sidi Ben Aïssa', 'Hammam Bou Hadid', 'Aïn Kermes', 'Chentouf'],
  },
  {
    code: '47', name: 'Ghardaïa', ar: 'غرداية', lat: 32.49, lon: 3.67,
    communes: ['Ghardaïa', 'Bir Ghardaïa', 'Bordj El Okhrane', 'Mansoura', 'Metlili', 'Sebt Gzoula', 'El Atteuf'],
  },
  {
    code: '48', name: 'Relizane', ar: 'غليزان', lat: 35.7372, lon: 0.5558,
    communes: ['Relizane', 'Oued R’hiou', 'Zemmana', 'Sidi M’hamed', 'Ammi Moussa', 'El Marsa', 'Moulay', 'Oued El Abtal'],
  },
  {
    code: '49', name: 'Timimoun', ar: 'تيميمون', lat: 29.2639, lon: 0.2306,
    communes: ['Timimoun', 'Ouled Saïd', 'Deldoul', 'Charouine', 'Admer', 'Tinerkouk', 'Ouled Ganaïssa'],
  },
  {
    code: '50', name: 'Bordj Badji Mokhtar', ar: 'برج باجي مختار', lat: 21.325, lon: 0.9556,
    communes: ['Bordj Badji Mokhtar', 'Timiaouine'],
  },
  {
    code: '51', name: 'Ouled Djellal', ar: 'أولاد جلال', lat: 34.4167, lon: 5.0667,
    communes: ['Ouled Djellal', 'Besbes', 'Ras El Miaad', 'El Fehria', 'Sidi Khaled', 'Ouled Sidi Slimane'],
  },
  {
    code: '52', name: 'Béni Abbès', ar: 'بني عباس', lat: 30.1333, lon: -2.1667,
    communes: ['Béni Abbès', 'Igli', 'El Ouata', 'Kerzaz', 'Tinerkouk', 'Charouine'],
  },
  {
    code: '53', name: 'In Salah', ar: 'عين صالح', lat: 27.1936, lon: 2.4606,
    communes: ['In Salah', 'Foggaret Ezzoua', 'Tin El Koum'],
  },
  {
    code: '54', name: 'In Guezzam', ar: 'عين قزام', lat: 19.5686, lon: 5.7722,
    communes: ['In Guezzam', 'Tin Zaouatine'],
  },
  {
    code: '55', name: 'Touggourt', ar: 'تقرت', lat: 33.1058, lon: 6.0578,
    communes: ['Touggourt', 'Tebesbest', 'El Hadjira', 'Megarine', 'Nezla', 'Sidi Slimane', 'Temacine'],
  },
  {
    code: '56', name: 'Djanet', ar: 'جانت', lat: 24.5542, lon: 9.4842,
    communes: ['Djanet', 'Bordj El Haouas'],
  },
  {
    code: '57', name: 'El M’Ghair', ar: 'المغير', lat: 33.95, lon: 5.9167,
    communes: ['El M’Ghair', 'Djamaa', 'Sidi Slimane', 'Temacine', 'Sidi Chamarouch', 'Hassi Fehal'],
  },
  {
    code: '58', name: 'El Meniaa', ar: 'المنيعة', lat: 30.5833, lon: 2.8833,
    communes: ['El Meniaa', 'Hassi Gara', 'Hassi Fehal', 'El Gara', 'Ouled Brahim', 'Aïn El Hadjar'],
  },
];

// Lowercase and drop the accents so "Béjaïa", "bejaia" and "BEJAIA" match.
function normalizePlace(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

const WILAYA_INDEX = new Map();
for (const wilaya of WILAYAS) {
  WILAYA_INDEX.set(normalizePlace(wilaya.name), wilaya);
  WILAYA_INDEX.set(normalizePlace(wilaya.ar), wilaya);
}

// Finds a wilaya from a free-text value, whatever its case or accents.
function findWilaya(value) {
  const key = normalizePlace(value);
  if (!key) {
    return null;
  }
  return WILAYA_INDEX.get(key) || null;
}

function isKnownWilaya(value) {
  return Boolean(findWilaya(value));
}

// Returns the canonical wilaya name, or null when the value is unknown.
function canonicalWilaya(value) {
  const wilaya = findWilaya(value);
  return wilaya ? wilaya.name : null;
}

// Suggestions for the commune field, based on the selected wilaya.
function communesFor(value) {
  const wilaya = findWilaya(value);
  if (!wilaya) {
    return [];
  }
  return wilaya.communes;
}

function wilayaOptions() {
  return WILAYAS.map((wilaya) => ({ code: wilaya.code, name: wilaya.name, ar: wilaya.ar }));
}

module.exports = {
  WILAYAS,
  normalizePlace,
  findWilaya,
  isKnownWilaya,
  canonicalWilaya,
  communesFor,
  wilayaOptions,
};
