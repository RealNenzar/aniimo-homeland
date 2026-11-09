// In-game item thumbnails served by Aniimo Wiki (GameVault). Art belongs to Aniimo's rights holders.
const ids = {
  'Farmland':[[1,'10100001'],[4,'10100004']], 'Woodland':[[1,'10100011'],[3,'10100013']],
  'Mine':[[1,'10100021']], 'Nimbus Bed':[[1,'10100031']], 'Dewy House':[[1,'10100041']],
  'Starfall Hammock':[[1,'10100051']], 'Tidewhisper Sandcastle':[[1,'10100061']], 'Floral Windmill':[[1,'10100071']], 'Well':[[1,'10100081']],
  'Carousel Mill':[[1,'10200001'],[4,'10200003']], 'Crafting Table':[[1,'10200011'],[5,'10200014']],
  'Jukebox Dryer':[[1,'10200021'],[4,'10200023']], 'Claw Game Cooker':[[1,'10200031'],[5,'10200033']],
  'Joy Wheel Loom':[[1,'10200041'],[2,'10200043']], 'Phonolfactory Table':[[1,'10200051'],[3,'10200053']],
  'Bouncy Brew Keg':[[1,'10200061'],[3,'10200062']], 'Simmering Pot':[[1,'10200071']], 'Blazing Stove':[[1,'10200081']],
  'Woodworking Bench':[[1,'10200091']], 'Chimney Kiln':[[1,'10200101']], 'Pickling Jar':[[1,'10200111']],
  'Aniipod Maker':[[1,'10300011']], 'Dance Pad Polisher':[[1,'10300021']], 'Storage Unit':[[1,'10400001']],
  'Crackle Power Pole':[[1,'10400011']], 'Crackle Generator':[[1,'10400021']], 'Heat Furnace':[[1,'10400031']],
  'Cooling Unit':[[1,'10400041']], 'Sunlamp':[[1,'10400051']]
};
export function facilityImage(name,level=1){const choices=ids[name];if(!choices)return null;const id=choices.filter(([min])=>min<=level).at(-1)?.[1]||choices[0][1];return `https://aniimo.gamevault.in/generated/media/items/ui_item_${id}.webp`}
