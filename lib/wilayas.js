// Reference data for the 58 Algerian wilayas and their main communes.
// Communes are only suggestions: the commune field stays free text so a
// missing entry never blocks a trip, while the wilaya is validated.
const WILAYAS = [
  {
    code: '01', name: 'Adrar', ar: 'أدرار',
    communes: ['Adrar', 'Reggane', 'Sidi Amrane', 'Tsabit', 'Aougrout', 'Tamtert', 'Timiaouine', 'In El Meskine'],
  },
  {
    code: '02', name: 'Chlef', ar: 'الشلف',
    communes: ['Chlef', 'Oued Fodha', 'Bouzaria', 'El Kari', 'Kherracha', 'Tadjra', 'Oued Souss', 'Sidi Abdelkader', 'Herraoua', 'Zerouabia'],
  },
  {
    code: '03', name: 'Laghouat', ar: 'الأغواط',
    communes: ['Laghouat', 'Ksar Hirane', 'Beidja', 'Brida', 'El Ghicha', 'Hassi Delaa', 'Aflou', 'Oued Morba', 'Sidi Makhlouf'],
  },
  {
    code: '04', name: 'Oum El Bouaghi', ar: 'أم البواقي',
    communes: ['Oum El Bouaghi', 'Aïn Beïda', 'Sigus', 'El Amiria', 'Aïn M’lila', 'Meskiana', 'Oued Nini', 'Fkirina', 'Berriche', 'Ouled Hamla'],
  },
  {
    code: '05', name: 'Batna', ar: 'باتنة',
    communes: ['Batna', 'Barika', 'Arris', 'Tigherghar', 'Ras El Aioun', 'Aïn Touta', 'N’Gour', 'Bouarek', 'Tala Hamza'],
  },
  {
    code: '06', name: 'Béjaïa', ar: 'بجاية',
    communes: ['Béjaïa', 'Akbou', 'Amizour', 'Boghni', 'El Kseur', 'Khemra', 'Sidi Aïch', 'Tizi N’Berber', 'Souk El Tenine', 'Bounouh', 'Aït Maouche', 'Sidi Salem'],
  },
  {
    code: '07', name: 'Biskra', ar: 'بسكرة',
    communes: ['Biskra', 'Tolga', 'Zaboussa', 'Ferkhani', 'El Kantara', 'M’Chouneche', 'Meziane', 'Branis'],
  },
  {
    code: '08', name: 'Béchar', ar: 'بشار',
    communes: ['Béchar', 'Abdelkader', 'Ksar Kenadra', 'Mougheul', 'Taghit', 'Boudjedra', 'Sidi Labdar', 'M’dourab'],
  },
  {
    code: '09', name: 'Blida', ar: 'البليدة',
    communes: ['Blida', 'Boufarik', 'Larbaâ', 'Oued El Alleug', 'Bouinan', 'Ouled Yaïch', 'Ben Khelil', 'Soumaa', 'Chiffa', 'Mouzaïa'],
  },
  {
    code: '10', name: 'Bouira', ar: 'البويرة',
    communes: ['Bouira', 'Sour El Ghozlane', 'Sidi Mubarak', 'El Mokrani', 'Behlil', 'Choraga', 'Hasana', 'Theniet En Nasr'],
  },
  {
    code: '11', name: 'Tamanrasset', ar: 'تمنراست',
    communes: ['Tamanrasset', 'In Guezzam', 'Tin Zaouatine', 'Abane Ramdane', 'Tafidet', 'Thalaouine'],
  },
  {
    code: '12', name: 'Tébessa', ar: 'تبسة',
    communes: ['Tébessa', 'El Hochra', 'Bir El Djir', 'El Maadher', 'El Ogla', 'Thelep', 'Cheraga', 'Hanchir Toumghani'],
  },
  {
    code: '13', name: 'Tlemcen', ar: 'تلمسان',
    communes: ['Tlemcen', 'Mansourah', 'Chouaïef', 'Nedroma', 'M’sir Ben Mara', 'Ghazaouet', 'Maghna', 'Hammam Bou Khadid', 'Beni Snous'],
  },
  {
    code: '14', name: 'Tiaret', ar: 'تيارت',
    communes: ['Tiaret', 'Frenda', 'Sougueur', 'Mahdia', 'Nador', 'Taourt', 'Amouchas', 'Takriza'],
  },
  {
    code: '15', name: 'Tizi Ouzou', ar: 'تيزي وزو',
    communes: ['Tizi Ouzou', 'Azazga', 'Draâ Ben Khedda', 'Bounouh', 'Iferhounène', 'Aïn Lechiakh', 'Mekhadma', 'Aït Mahmoud', 'Tizi Ras', 'Illilten'],
  },
  {
    code: '16', name: 'Alger', ar: 'الجزائر',
    communes: ['Alger', 'Bab Ezzouar', 'Birkhadem', 'Bologhine', 'El Harrach', 'Kouba', 'Hydra', 'El Biar', 'Béchardja', 'Bir Mourad Raïs', 'Chéraga', 'Dely Ibrahim', 'El Mouradia', 'Aïn Benian', 'Dar El Beïda'],
  },
  {
    code: '17', name: 'Djelfa', ar: 'الجلفة',
    communes: ['Djelfa', 'Aïn Oussera', 'Messaâda', 'Sidi Amar', 'Hassi Bahdach', 'Zeribba', 'Idles Dehez', 'Beni Tamou'],
  },
  {
    code: '18', name: 'Jijel', ar: 'جيجل',
    communes: ['Jijel', 'El Akhdar', 'Chebara', 'El Milia', 'Tahanna', 'Ziama', 'Bordj Thar', 'El Aouja', 'Ouled Aïssa'],
  },
  {
    code: '19', name: 'Sétif', ar: 'سطيف',
    communes: ['Sétif', 'Aïn Arnat', 'El Eulma', 'Bougaa', 'Bordj Ghedir', 'Hassi Messaoud', 'Aïn Sebt', 'Maaï', 'El Maïn'],
  },
  {
    code: '20', name: 'Saïda', ar: 'سعيدة',
    communes: ['Saïda', 'Aïn El Hadjar', 'Oued Sâdi', 'Sidi Boubakeur', 'Moulay Belkacem', 'Youcef', 'El Hachimia'],
  },
  {
    code: '21', name: 'Skikda', ar: 'سكيكدة',
    communes: ['Skikda', 'El Hattab', 'Ben Thour', 'Ouled Zouaï', 'Behir Chergui', 'Zorg', 'El Meskine', 'Bena Azziz'],
  },
  {
    code: '22', name: 'Sidi Bel Abbès', ar: 'سيدي بلعباس',
    communes: ['Sidi Bel Abbès', 'Sidi Ali Ben Youb', 'Sfizig', 'Mostefa Ben Boulaïd', 'Béni Badis', 'Sidi Brahim', 'Tessen', 'Merad'],
  },
  {
    code: '23', name: 'Annaba', ar: 'عنابة',
    communes: ['Annaba', 'El Bouni', 'Sidi Amar', 'Boussem', 'Chelghoum Laïd', 'Thia', 'El Hadjar', 'Sidi M’hamed'],
  },
  {
    code: '24', name: 'Guelma', ar: 'قالمة',
    communes: ['Guelma', 'Oued El Ma', 'Bouhennat', 'Pensive', 'Hammam Soukhan', 'Bou Hikrane', 'Kouma', 'Medeana'],
  },
  {
    code: '25', name: 'Constantine', ar: 'قسنطينة',
    communes: ['Constantine', 'El Khroub', 'Zouaghi', 'Birk Rostane', 'Sidi Mabrouk', 'Hussein Dey', 'Ben Badis', 'Oued Zgar', 'Aïn Smara'],
  },
  {
    code: '26', name: 'Médéa', ar: 'المدية',
    communes: ['Médéa', 'Berrouaghia', 'Ouzera', 'El Omaria', 'Ksar Boukhari', 'Beni Slimane', 'Aïn Boucif', 'Sidi Naamane', 'Chahbounia'],
  },
  {
    code: '27', name: 'Mostaganem', ar: 'مستغانم',
    communes: ['Mostaganem', 'Sidi Ali', 'Bougraâ', 'Hassi M’Hidi', 'Tighnif', 'Sirat', 'Mesghert', 'Kerrouana'],
  },
  {
    code: '28', name: 'M’Sila', ar: 'المسيلة',
    communes: ['M’Sila', 'Bou Saâda', 'Sidi Aïssa', 'M’Hamid', 'Koudia', 'Slim', 'Ouled Sidi M’hamed', 'Beni Errabia'],
  },
  {
    code: '29', name: 'Mascara', ar: 'معسكر',
    communes: ['Mascara', 'Tighennif', 'Boudoua', 'Ghriss', 'Sidi Aïssa', 'El Moulai', 'Oued El Abtal', 'M’Hamed'],
  },
  {
    code: '30', name: 'Ouargla', ar: 'ورقلة',
    communes: ['Ouargla', 'El Alia', 'Hassi Messaoud', 'Tebesbest', 'Nezla', 'Sidi Slimane', 'Hassi Fehal', 'Taibet'],
  },
  {
    code: '31', name: 'Oran', ar: 'وهران',
    communes: ['Oran', 'Es Sénia', 'Bir El Djir', 'Bedia', 'El Kerma', 'Aïn El Turk', 'Sidi El Bachir', 'Mansourah', 'Bousfer', 'Arzew', 'M’Pila'],
  },
  {
    code: '32', name: 'El Bayadh', ar: 'البيضاض',
    communes: ['El Bayadh', 'Bougzoul', 'El Assafia', 'GhassTouria', 'Kerroucha', 'Labiodh Sidi Cheikh', 'Sidi Brahim', 'Chellala'],
  },
  {
    code: '33', name: 'Illizi', ar: 'إليزي',
    communes: ['Illizi', 'In Amenas', 'Djanet', 'Bordj El Haouas', 'El Golea'],
  },
  {
    code: '34', name: 'Bordj Bou Arréridj', ar: 'برج بوعريريج',
    communes: ['Bordj Bou Arréridj', 'Bordj Ghedir', 'M’Bouraïda', 'Ras El Oued', 'Mansoura', 'El Annaba', 'Sidi Aïch', 'Bordj Tighrad'],
  },
  {
    code: '35', name: 'Boumerdès', ar: 'بومرداس',
    communes: ['Boumerdès', 'Delga', 'Sidi M’hamed', 'Saâda', 'Kef Lakhdar', 'Bordj El Bahri', 'Isser', 'Charbouné'],
  },
  {
    code: '36', name: 'El Tarf', ar: 'الطارف',
    communes: ['El Tarf', 'El Kala', 'Boutlelis', 'Ouled Gacem', 'Bouchtoub', 'Souriane', 'Zitouna', 'Fetzoua'],
  },
  {
    code: '37', name: 'Tindouf', ar: 'تندوف',
    communes: ['Tindouf', 'Oum Elessel'],
  },
  {
    code: '38', name: 'Tissemsilt', ar: 'تيسمسيلت',
    communes: ['Tissemsilt', 'Theniet El Hadjar', 'Lal Clinic', 'Aïn Deheb', 'Sidi Larbi', 'Oued El Maden', 'Bordj Lakhdar'],
  },
  {
    code: '39', name: 'El Oued', ar: 'الوادي',
    communes: ['El Oued', 'Guemar', 'El Alia', 'Hammam Dhalaa', 'Djamaa', 'M’Consa', 'Taghzaiet', 'Sidi Amrane'],
  },
  {
    code: '40', name: 'Khenchela', ar: 'خنشلة',
    communes: ['Khenchela', 'Kaïs', 'Chahia', 'Zabad', 'Remchi', 'Dahra', 'Taïbara'],
  },
  {
    code: '41', name: 'Souk Ahras', ar: 'سوق أهراس',
    communes: ['Souk Ahras', 'Mechraâ', 'Madragh', 'Ouled Driss', 'Taoura', 'Bîr Bou Aqqous', 'Zouagha', 'Hannibal'],
  },
  {
    code: '42', name: 'Tipaza', ar: 'تيبازة',
    communes: ['Tipaza', 'Cherchell', 'Bou Ismail', 'Sidi Amar', 'Fouaga', 'Dourdis', 'Hadjout', 'Sidi M’hamed'],
  },
  {
    code: '43', name: 'Mila', ar: 'ميلة',
    communes: ['Mila', 'Chelghoum Laïd', 'Ferdji', 'Rached', 'Tessala El Merdja', 'Ouled M’Lila', 'Slim', 'Zerdouna'],
  },
  {
    code: '44', name: 'Aïn Defla', ar: 'عين الدفلى',
    communes: ['Aïn Defla', 'Miliana', 'Bir Ben Laabed', 'Rouïba', 'El Milia', 'Mezerana', 'Oued El Alleug'],
  },
  {
    code: '45', name: 'Naâma', ar: 'النعامة',
    communes: ['Naâma', 'M’sâna', 'Aïn Séfra', 'Tiout', 'Mechria', 'Sfizig', 'Aïn Ben Amar'],
  },
  {
    code: '46', name: 'Aïn Témouchent', ar: 'عين تموشنت',
    communes: ['Aïn Témouchent', 'Témouchent', 'Ouled Aïssa', 'Sidi Ben Aïssa', 'Hammam Bou Hadid', 'Aïn Kermes', 'Chentouf'],
  },
  {
    code: '47', name: 'Ghardaïa', ar: 'غرداية',
    communes: ['Ghardaïa', 'Bir Ghardaïa', 'Bordj El Okhrane', 'Mansoura', 'Metlili', 'Sebt Gzoula', 'El Atteuf'],
  },
  {
    code: '48', name: 'Relizane', ar: 'غليزان',
    communes: ['Relizane', 'Oued R’hiou', 'Zemmana', 'Sidi M’hamed', 'Ammi Moussa', 'El Marsa', 'Moulay', 'Oued El Abtal'],
  },
  {
    code: '49', name: 'Timimoun', ar: 'تيميمون',
    communes: ['Timimoun', 'Ouled Saïd', 'Deldoul', 'Charouine', 'Admer', 'Tinerkouk', 'Ouled Ganaïssa'],
  },
  {
    code: '50', name: 'Bordj Badji Mokhtar', ar: 'برج باجي مختار',
    communes: ['Bordj Badji Mokhtar', 'Timiaouine'],
  },
  {
    code: '51', name: 'Ouled Djellal', ar: 'أولاد جلال',
    communes: ['Ouled Djellal', 'Besbes', 'Ras El Miaad', 'El Fehria', 'Sidi Khaled', 'Ouled Sidi Slimane'],
  },
  {
    code: '52', name: 'Béni Abbès', ar: 'بني عباس',
    communes: ['Béni Abbès', 'Igli', 'El Ouata', 'Kerzaz', 'Tinerkouk', 'Charouine'],
  },
  {
    code: '53', name: 'In Salah', ar: 'عين صالح',
    communes: ['In Salah', 'Foggaret Ezzoua', 'Tin El Koum'],
  },
  {
    code: '54', name: 'In Guezzam', ar: 'عين قزام',
    communes: ['In Guezzam', 'Tin Zaouatine'],
  },
  {
    code: '55', name: 'Touggourt', ar: 'تقرت',
    communes: ['Touggourt', 'Tebesbest', 'El Hadjira', 'Megarine', 'Nezla', 'Sidi Slimane', 'Temacine'],
  },
  {
    code: '56', name: 'Djanet', ar: 'جانت',
    communes: ['Djanet', 'Bordj El Haouas'],
  },
  {
    code: '57', name: 'El M’Ghair', ar: 'المغير',
    communes: ['El M’Ghair', 'Djamaa', 'Sidi Slimane', 'Temacine', 'Sidi Chamarouch', 'Hassi Fehal'],
  },
  {
    code: '58', name: 'El Meniaa', ar: 'المنيعة',
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
