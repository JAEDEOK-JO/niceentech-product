export const departments = [
  {
    key: 'sales',
    name: '영업부',
    badge: '김두일 이사',
    summary: '신규 영업, 현장 납기 및 AS, 월 물량 보고를 담당합니다.',
    pageTasks: [
      '신규영업 : 아파트 외 물류창고, 지식산업센터, 일반업무용 건물 60% 이상 확보',
      '매출처 현장 납기 및 AS 관리',
      '매월 잔여물량 및 신규 예상 물량 보고서 작성',
      '동종업계 현황 조사 및 보고',
    ],
    standardRole: {
      department: '영업부',
      position: '이사',
      owner: '김두일',
      duties: [
        '신규 영업 전략 수립 및 실행',
        '물류창고, 지식산업센터 등 비아파트 영업 60% 이상 확보',
        '현장 납기 및 AS 총괄',
        '월별 잔여 및 신규 예상 물량 보고',
      ],
    },
    raci: {
      responsible: ['수주 및 신규영업', '출하 및 납기', 'AS 및 현장관리'],
      consulted: ['물량산출 및 설계', '생산계획'],
      informed: ['자재관리'],
    },
    kpi: '신규수주 확대',
    kpiTarget: '비아파트 수주 60% 이상',
    monthlyReport: '잔여 및 신규예상 물량',
    executiveMetrics: [
      {
        label: '월 목표 매출',
        description: '당월 목표 대비 매출 달성 수준을 대표이사가 바로 확인할 수 있는 핵심 지표',
      },
      {
        label: '현재 누적 매출',
        description: '실적 추이를 보고 월말 달성 가능성을 판단하는 기준 지표',
      },
      {
        label: '신규 수주',
        description: '다음 달 이후 매출로 이어질 신규 영업 성과를 확인하는 지표',
      },
      {
        label: '비아파트 수주 비중',
        description: '영업 포트폴리오 다변화 목표 달성 여부를 판단하는 지표',
      },
      {
        label: '납기 준수율',
        description: '고객 신뢰와 현장 대응 품질을 확인하는 운영 지표',
      },
      {
        label: 'AS 발생 건수',
        description: '납품 이후 문제 발생 수준과 사후 대응 부담을 보여주는 지표',
      },
    ],
    tone: 'indigo',
  },
  {
    key: 'design',
    name: '설계팀',
    badge: '김호연 부장',
    summary: '도면 입도 후 산출·견적·작도와 납기 일정 조율을 담당합니다.',
    pageTasks: [
      '도면 입도 후 1주일 내 물량산출, 견적 및 작도 완료',
      '현장 여건에 따른 설계 조율',
      '거래명세서, 자재산출 및 청구 재고현황 관리',
      '영업부와 납기 일정 조율 및 월별 물량 보고',
      '생산부와 생산 일정 조율',
    ],
    standardRole: {
      department: '설계팀',
      position: '부장',
      owner: '김호연',
      duties: [
        '도면 입도 후 1주 내 물량산출 및 견적',
        '작도 및 설계 검토',
        '자재산출 및 재고 연계',
        '영업·생산부 납기 일정 조율',
      ],
    },
    raci: {
      responsible: ['물량산출 및 설계'],
      consulted: ['수주 및 신규영업', '자재관리', '생산계획', '출하 및 납기', 'AS 및 현장관리'],
      informed: [],
    },
    kpi: '설계 리드타임',
    kpiTarget: '도면입도 후 7일 내 산출 완료',
    monthlyReport: '설계 진행현황',
    executiveMetrics: [
      {
        label: '도면 입도 건수',
        description: '설계팀으로 유입되는 전체 업무량과 처리 부담을 보여주는 지표',
      },
      {
        label: '7일 내 산출 완료율',
        description: '설계 리드타임 기준 준수 여부를 대표이사가 확인하는 핵심 지표',
      },
      {
        label: '진행 중 견적·작도 건수',
        description: '현재 체류 중인 설계 업무 규모와 병목 가능성을 파악하는 지표',
      },
      {
        label: '납기 위험 현장',
        description: '설계 지연으로 생산이나 납기에 영향이 예상되는 현장을 바로 보는 지표',
      },
      {
        label: '발주 필요 항목',
        description: '자재 연계 이슈로 이어질 수 있는 주요 품목을 선제적으로 확인하는 지표',
      },
      {
        label: '설계 지연 건수',
        description: '약속한 완료 기한을 넘긴 건수를 통해 관리 우선순위를 정하는 지표',
      },
    ],
    tone: 'emerald',
  },
  {
    key: 'operations',
    name: '공무부',
    badge: '안상기 부장',
    summary: '출하, 포장, 자재, 외주 가공품과 차량·시설 관리를 담당합니다.',
    pageTasks: [
      '출하업무 및 물량팀 생산 조율',
      '포장, 누락 및 누수 관련 관리',
      '당사 및 발주처 자재관리',
      '월별 자재 재고조사 (외주업체 포함)',
      '차량관리(지게차 제외)',
      '자재 및 고철 관리',
      '통신 및 CCTV 관리',
      '쓰레기 처리 및 외주 가공품 관리',
    ],
    standardRole: {
      department: '공무부',
      position: '부장',
      owner: '안상기',
      duties: [
        '출하 및 포장 관리',
        '자재 및 외주 가공품 관리',
        '재고 조사 및 발주처 자재관리',
        '차량·통신·CCTV 및 시설 관리',
      ],
    },
    raci: {
      responsible: ['자재관리', '출하 및 납기'],
      consulted: ['물량산출 및 설계', 'AS 및 현장관리'],
      informed: ['수주 및 신규영업', '생산계획'],
    },
    kpi: '자재 및 출하 정확도',
    kpiTarget: '재고오차 최소화 / 납기 누락 ZERO',
    monthlyReport: '자재 및 재고현황',
    executiveMetrics: [
      {
        label: '출하 완료 건수',
        description: '실제 납품 이행 수준과 주간 출하 흐름을 대표이사가 보는 지표',
      },
      {
        label: '납기 지연 건수',
        description: '출하 차질과 고객 불만으로 이어질 위험을 즉시 확인하는 지표',
      },
      {
        label: '주요 자재 재고',
        description: '생산 지속 가능성과 발주 시급성을 판단하는 기본 지표',
      },
      {
        label: '재고 오차율',
        description: '실재고와 장부 차이를 통해 자재 관리 정확도를 판단하는 지표',
      },
      {
        label: '외주 가공품 입출고 현황',
        description: '외주 물량 흐름과 납기 연계 리스크를 확인하는 지표',
      },
      {
        label: '발주 필요 항목',
        description: '단기 내 품절 또는 생산 차질이 우려되는 품목을 보고하는 지표',
      },
    ],
    tone: 'amber',
  },
  {
    key: 'production',
    name: '생산부',
    badge: '조재덕 차장',
    summary: '도면 기준 제품 생산, 생산 인력 관리, 설비 및 장비 점검 업무를 담당합니다.',
    pageTasks: [
      '작도 도면 기준 메인관, 가지관, 나사, 그루브 생산',
      '생산인력 인사관리',
      '식당, 숙소, 휴게실 등 물건 및 부속건물 관리',
      '지게차 및 공장 내 장비 재고 파악 및 정기 점검',
    ],
    standardRole: {
      department: '생산부',
      position: '차장',
      owner: '조재덕',
      duties: [
        '도면 기준 제품 생산 총괄',
        '생산 인력 관리',
        '공장 설비 및 장비 점검',
        '지게차 및 공장 운영 관리',
      ],
    },
    raci: {
      responsible: ['생산계획'],
      consulted: ['물량산출 및 설계', '자재관리', '출하 및 납기'],
      informed: ['수주 및 신규영업', 'AS 및 현장관리'],
    },
    kpi: '생산 효율',
    kpiTarget: '계획대비 생산달성률 95% 이상',
    monthlyReport: '생산실적 및 설비점검',
    executiveMetrics: [
      {
        label: '주간 생산계획',
        description: '이번 주 생산 목표와 우선순위를 대표이사가 확인하는 기준 지표',
      },
      {
        label: '생산실적',
        description: '실제 완료 물량을 통해 생산부 실행력을 판단하는 지표',
      },
      {
        label: '계획 대비 달성률',
        description: '생산 목표 이행 수준을 한눈에 파악하는 대표 성과 지표',
      },
      {
        label: '공정 지연 품목',
        description: '납기 영향 가능성이 높은 병목 품목을 조기에 확인하는 지표',
      },
      {
        label: '설비 이상 여부',
        description: '생산 차질로 이어질 장비 문제를 선제적으로 공유하는 지표',
      },
      {
        label: '인력 부족 여부',
        description: '추가 인력 투입이나 일정 조정이 필요한 상황을 판단하는 지표',
      },
    ],
    tone: 'rose',
  },
]
