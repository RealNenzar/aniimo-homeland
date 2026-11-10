// Exact, source-checked examples; these are suggestions, not the player's roster.
// Portraits and worker abilities: https://aniimoguide.com/homeland/workers
const families={
 Celestis:{Dark:{1:['Celestis',10011],3:['Stellarys',10012]},Leisure:{1:['Celestis',10011],3:['Stellarys',10012]}},
 Iris:{Grass:{1:['Iris',10211],3:['Irisal',10212],4:['Irisalis',10213]},Leisure:{1:['Iris',10211],3:['Irisal',10212],4:['Irisalis',10213]}},
 Dewy:{Dark:{1:['Dewy',10351],3:['Fragrancier',10352]},Leisure:{1:['Dewy',10351],3:['Fragrancier',10352]},Perfumery:{1:['Dewy',10351],3:['Fragrancier',10352]}},
 Nimbi:{Wind:{1:['Nimbi',10261],3:['Turbo',10262]},Leisure:{1:['Nimbi',10261],3:['Turbo',10262]}},
 Flutternym:{Wind:{1:['Flutternym',10231],3:['Gracewing',10232]},Leisure:{1:['Flutternym',10231],3:['Gracewing',10232],4:['Somniwing',10233]}},
 Susuta:{Water:{1:['Susuta',10171],2:['Popota',10172],3:['Piopiota',10173]},Leisure:{1:['Susuta',10171],2:['Popota',10172],3:['Piopiota',10173]}},
 Shelly:{Water:{1:['Shelly',10191],2:['Sheldon',10192],3:['Sherro',10194]},Leisure:{1:['Shelly',10191],2:['Sheldon',10192],3:['Sherro',10194]}}
};
const general={
 Fire:{1:['Emberpup',10051],2:['Flameruff',10052],3:['Scorchhowl',10053]},
 Water:{1:['Skippy',10041],2:['Pranky',10042],3:['Glacy',10043]},
 Earth:{1:['Cubbo',10501],2:['Geodeback',10284],3:['Grizbo',10503]},
 Grass:{1:['Iris',10211],2:['Shrubclaw',10162],3:['Leafy',10045],4:['Irisalis',10213]},
 Wind:{1:['Chirpi',10181],2:['Helmwhelp',10022],3:['Cornet',10185]},
 Dark:{1:['Wisptis',10031],2:['Hexxin',10203],3:['Stellarys',10012]},
 Lightning:{1:['Bolty',10221],2:['Veilfloat',10142],3:['Blazen',10222]},
 Ice:{1:['Bonesky',10131],2:['Fenrier',10132],3:['Glynsera',10133]},
 Light:{3:['Lunara',10371]},Hauling:{1:['Cubbo',10501],2:['Flameruff',10052],3:['Grizbo',10503]},
 Artisanship:{1:['Wisptis',10031],2:['Hexxin',10203],3:['Luminelle',10143]},
 Leisure:{1:['Iris',10211],2:['Popota',10172],3:['Irisal',10212],4:['Irisalis',10213]},
 Perfumery:{1:['Dewy',10351],3:['Fragrancier',10352]}
};
export function findAniimoExample(ability,level,family){
 const entry=(family?families[family]?.[ability]:general[ability])?.[level];
 return entry?{name:entry[0],portrait:`https://aniimoguide.com/images/aniimo/head_round/${entry[1]}.webp`}:null;
}
