const sizes = (...values) => values

export const subsidiaryCatalogGroups = [
  ['FL', ['용접식', '나사식']],
  ['45도 엘보(w)', sizes('25A', '32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A')],
  ['엘보(w)', sizes('25A', '32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A')],
  ['티(w)', sizes('25A', '32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A')],
  ['정심 레듀사(W)', sizes('50A*25A', '65A*25A', '65A*32A', '80A*65A', '100A*65A', '125A*65A', '125A*80A', '150A*65A', '150A*80A', '150A*100A')],
  ['편심 레듀사(W)', sizes('50A*25A', '65A*25A', '65A*32A', '80A*65A', '100A*65A', '125A*65A', '125A*80A', '150A*65A', '150A*80A', '150A*100A')],
  ['플렌지', sizes('32A', '40A', '50A', '65A', '80A', '100A', '125A', '150A')],
  ['엘보(S)', sizes('25A', '32A', '40A', '50A')],
  ['45도 엘보(S)', sizes('25A', '32A', '40A', '50A')],
  ['티(S)', sizes('25A X 25A', '32A X 25A', '32A X 32A', '40A X 25A', '40A X 32A', '40A X 40A', '50A X 25A', '50A X 32A', '50A X 50A')],
  ['레듀샤(S)', sizes('25AX15A', '32AX25A', '40AX25A', '40AX32A', '50AX25A', '50AX32A', '50AX40A')],
  ['주물소켓 (S)', sizes('25A', '32A', '40A', '50A', '65A')],
  ['CAP(S)', sizes('25A', '32A', '40A', '50A')],
  ['장니플', ['25A X 100L']],
  ['베벨엘보', sizes('50A', '65A', '80A')],
  ['베벨티 (A)', sizes('50A', '65A', '80A')],
  ['베벨티 (B)', sizes('50A', '65A', '80A')],
  ['개선각', sizes('25A', '32A', '40A', '50A', '65A', '80A')],
]

export const subsidiaryCatalogRows = subsidiaryCatalogGroups.flatMap(([materialGroup, specs], groupIndex) =>
  specs.map((spec, specIndex) => ({
    material_group: materialGroup,
    spec,
    sort_order: 1000 + groupIndex * 100 + specIndex * 10,
  })),
)
