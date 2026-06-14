import type { ScenarioInfo, ScenarioCategory } from '$lib/types';

export const scenarioCategoryLabels: Record<ScenarioCategory, string> = {
	'collision': '避碰',
	'distress': '遇险',
	'pilotage': '引航',
	'quarantine': '检疫',
	'dangerous-cargo': '装卸危险品',
	'towing': '拖带作业'
};

export const scenarios: ScenarioInfo[] = [
	{
		id: 'collision-001',
		category: 'collision',
		categoryLabel: '避碰',
		title: '对遇局面紧急避让',
		description: '你船在开阔水域与来船构成对遇局面，存在碰撞危险。请按国际信号规则编排正确的信号旗组。',
		context: '夜间航行，能见距离5海里，你船速度12节，来船相对方位000度，距离3海里，双方正在接近。根据《国际海上避碰规则》，对遇局面应各自向右转向。',
		difficulty: 'easy',
		timeLimit: 120,
		standardGroups: [
			{
				id: 'collision-001-g1',
				order: 1,
				codes: ['D'],
				meaning: '请让开我，我操纵困难',
				purpose: '表明本船操纵受限，警告来船注意',
				critical: false,
				duration: 3
			},
			{
				id: 'collision-001-g2',
				order: 2,
				codes: ['E'],
				meaning: '我正在向右转向',
				purpose: '明确告知来船我船正在向右转向，按照避碰规则采取正确行动',
				critical: true,
				duration: 5
			},
			{
				id: 'collision-001-g3',
				order: 3,
				codes: ['U'],
				meaning: '你正在临近危险',
				purpose: '警示来船双方正在临近危险，敦促其采取避让行动',
				critical: true,
				duration: 5
			}
		],
		alternativeGroups: [
			{
				id: 'collision-001-alt1',
				order: 2,
				codes: [['L']],
				meaning: '你应立即停船',
				equivalenceLevel: 'acceptable'
			},
			{
				id: 'collision-001-alt2',
				order: 3,
				codes: [['X']],
				meaning: '停止你的意图，注意我',
				equivalenceLevel: 'acceptable'
			}
		],
		keyPoints: [
			'对遇局面下应各自向右转向',
			'E旗（向右转向）是核心信号，必须包含',
			'U旗用于警示危险，强烈建议使用',
			'信号发送顺序：先表明状况 → 声明行动 → 警示对方'
		]
	},
	{
		id: 'collision-002',
		category: 'collision',
		categoryLabel: '避碰',
		title: '交叉相遇局面（让路船）',
		description: '你船与右舷来船构成交叉相遇局面，你船为让路船。请编排正确的信号旗组序列。',
		context: '白天航行，能见度良好，你船为机动船，右舷30度方向有来船，航速相近，距离2.5海里，构成碰撞危险。根据规则，你船应给右舷来船让路。',
		difficulty: 'medium',
		timeLimit: 150,
		standardGroups: [
			{
				id: 'collision-002-g1',
				order: 1,
				codes: ['I'],
				meaning: '我正在向左转向',
				purpose: '声明我船正在向左转向以避让右舷来船',
				critical: true,
				duration: 5
			},
			{
				id: 'collision-002-g2',
				order: 2,
				codes: ['S'],
				meaning: '我机器正在倒车',
				purpose: '表明我船正在减速以避免碰撞',
				critical: false,
				duration: 3
			},
			{
				id: 'collision-002-g3',
				order: 3,
				codes: ['X'],
				meaning: '停止你的意图，注意我',
				purpose: '提醒来船注意我船的避让行动',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'collision-002-alt1',
				order: 1,
				codes: [['D']],
				meaning: '请让开我，我操纵困难',
				equivalenceLevel: 'partial'
			},
			{
				id: 'collision-002-alt2',
				order: 2,
				codes: [['M']],
				meaning: '我船已停，并不对水移动',
				equivalenceLevel: 'acceptable'
			}
		],
		keyPoints: [
			'交叉相遇局面下，让路船应给右舷来船让路',
			'I旗（向左转向）是让路船的核心信号',
			'S旗或M旗表明减速/停车，辅助避让',
			'大幅度行动，让来船能清楚观察到'
		]
	},
	{
		id: 'distress-001',
		category: 'distress',
		categoryLabel: '遇险',
		title: '船舶失火紧急求救',
		description: '你船机舱突然起火，火势迅速蔓延，需要立即援助。请编排完整的遇险求救信号序列。',
		context: '航行中机舱突发火灾，消防系统正在工作但火势难以控制，船上载有普通货物，船员安全受到威胁。距离最近港口约80海里，附近有商船航行。',
		difficulty: 'hard',
		timeLimit: 90,
		standardGroups: [
			{
				id: 'distress-001-g1',
				order: 1,
				codes: ['N', 'C'],
				meaning: '我船遇险，需要立即援助',
				purpose: '核心遇险信号，表明船舶处于紧急危险状态',
				critical: true,
				duration: 5
			},
			{
				id: 'distress-001-g2',
				order: 2,
				codes: ['C', 'B'],
				meaning: '本船失火，船上有爆炸品',
				purpose: '表明遇险原因是失火且有危险品，警告救援方注意风险',
				critical: true,
				duration: 5
			},
			{
				id: 'distress-001-g3',
				order: 3,
				codes: ['V'],
				meaning: '我需要援助',
				purpose: '明确请求任何形式的援助',
				critical: false,
				duration: 3
			},
			{
				id: 'distress-001-g4',
				order: 4,
				codes: ['W'],
				meaning: '我需要医疗援助',
				purpose: '如有人员受伤，请求医疗援助',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'distress-001-alt1',
				order: 1,
				codes: [['C', 'G'], ['F', 'F', 'F']],
				meaning: '本船失火，请求立即援助 / 本船失火，需要立即援助',
				equivalenceLevel: 'equivalent'
			},
			{
				id: 'distress-001-alt2',
				order: 2,
				codes: [['C', 'D']],
				meaning: '本船失火，船上有危险品',
				equivalenceLevel: 'acceptable'
			},
			{
				id: 'distress-001-alt3',
				order: 3,
				codes: [['A', 'N']],
				meaning: '我船需要援助',
				equivalenceLevel: 'equivalent'
			}
		],
		keyPoints: [
			'NC是国际通用遇险信号，必须第一时间发送',
			'CB/CD/CG等表明失火并说明危险程度',
			'遇险信号应优先于其他所有信号',
			'信号发送顺序：遇险信号 → 说明原因 → 请求援助'
		]
	},
	{
		id: 'distress-002',
		category: 'distress',
		categoryLabel: '遇险',
		title: '船舶搁浅请求援助',
		description: '你船在近岸航行时意外搁浅，船体受损。请编排正确的求救和状态信号。',
		context: '低潮时在近岸航道搁浅，船底触礁，主机仍可运转但无法脱浅，船体可能漏水。周围水深较浅，等待高潮或请求拖船援助。',
		difficulty: 'medium',
		timeLimit: 120,
		standardGroups: [
			{
				id: 'distress-002-g1',
				order: 1,
				codes: ['B', 'D'],
				meaning: '我船搁浅',
				purpose: '明确表明船舶搁浅状态',
				critical: true,
				duration: 5
			},
			{
				id: 'distress-002-g2',
				order: 2,
				codes: ['Z'],
				meaning: '我需要一艘拖船',
				purpose: '请求拖船协助脱浅',
				critical: true,
				duration: 5
			},
			{
				id: 'distress-002-g3',
				order: 3,
				codes: ['A', 'N'],
				meaning: '我船需要援助',
				purpose: '表明需要一般性援助',
				critical: false,
				duration: 3
			},
			{
				id: 'distress-002-g4',
				order: 4,
				codes: ['M'],
				meaning: '我船已停，并不对水移动',
				purpose: '说明当前船舶处于搁浅静止状态',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'distress-002-alt1',
				order: 1,
				codes: [['G', 'G', 'G']],
				meaning: '本船搁浅，需要立即援助',
				equivalenceLevel: 'equivalent'
			},
			{
				id: 'distress-002-alt2',
				order: 2,
				codes: [['B', 'A']],
				meaning: '请派拖船协助',
				equivalenceLevel: 'equivalent'
			}
		],
		keyPoints: [
			'BD或GGG是搁浅的标准信号',
			'搁浅后通常需要拖船援助（Z旗或BA）',
			'M旗说明船舶静止状态',
			'如情况严重可加发NC遇险信号'
		]
	},
	{
		id: 'pilotage-001',
		category: 'pilotage',
		categoryLabel: '引航',
		title: '抵港申请引航',
		description: '你船即将抵达目的港，按照港口规定需要申请引航员。请编排正确的引航信号序列。',
		context: '你船为外籍船舶，即将进入中国某港口引航锚地。港口规定所有外籍船舶必须强制引航。目前距离引航锚地约10海里，天气海况良好。',
		difficulty: 'easy',
		timeLimit: 90,
		standardGroups: [
			{
				id: 'pilotage-001-g1',
				order: 1,
				codes: ['G'],
				meaning: '我需要引航员',
				purpose: '明确向港口和引航站表明需要引航员',
				critical: true,
				duration: 5
			},
			{
				id: 'pilotage-001-g2',
				order: 2,
				codes: ['P'],
				meaning: '在港内：我将要出航；在港外：我的网挂在障碍物上',
				purpose: '在锚地/港外区域表明船舶状态，准备进港',
				critical: false,
				duration: 3
			},
			{
				id: 'pilotage-001-g3',
				order: 3,
				codes: ['D', 'L'],
				meaning: '请报告你船的航向',
				purpose: '与引航船/引航站沟通，说明意图',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'pilotage-001-alt1',
				order: 1,
				codes: [['P', 'I', 'L', 'O']],
				meaning: '请派引航员',
				equivalenceLevel: 'equivalent'
			}
		],
		keyPoints: [
			'G旗是申请引航的核心信号',
			'H旗表示船上已有引航员（登轮后使用）',
			'进港前提前在规定位置悬挂信号',
			'引航员登轮后应立即更换H旗'
		]
	},
	{
		id: 'pilotage-002',
		category: 'pilotage',
		categoryLabel: '引航',
		title: '引航员登轮后驶往泊位',
		description: '引航员已登轮，你船正跟随引航指令驶往泊位。请编排显示引航状态的信号。',
		context: '引航员已顺利登轮并开始引航工作，你船正在航道内行驶，前方2海里即为指定泊位。航道内船只较多，需要保持特别谨慎。',
		difficulty: 'easy',
		timeLimit: 60,
		standardGroups: [
			{
				id: 'pilotage-002-g1',
				order: 1,
				codes: ['H'],
				meaning: '我船上有引航员',
				purpose: '表明船上已有引航员，提醒其他船舶注意引航船享有优先权',
				critical: true,
				duration: 5
			},
			{
				id: 'pilotage-002-g2',
				order: 2,
				codes: ['D'],
				meaning: '请让开我，我操纵困难',
				purpose: '引航状态下船舶操纵受限，请求他船避让',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [],
		keyPoints: [
			'H旗是引航员登轮后的核心信号，必须悬挂',
			'引航完毕后应降下H旗',
			'可配合D旗表明操纵受限'
		]
	},
	{
		id: 'quarantine-001',
		category: 'quarantine',
		categoryLabel: '检疫',
		title: '抵港申请检疫',
		description: '你船从国外抵达中国港口，需要进行入境卫生检疫。请编排正确的检疫信号。',
		context: '你船从境外抵达，船上船员健康状况良好，没有发热或疑似传染病症状。船上有货物需要卸载，但必须先通过检疫检查。',
		difficulty: 'easy',
		timeLimit: 60,
		standardGroups: [
			{
				id: 'quarantine-001-g1',
				order: 1,
				codes: ['Q'],
				meaning: '我船没有染疫，请发给进口检疫证',
				purpose: '表明船舶无疫情，请求颁发检疫证（ pratique ）',
				critical: true,
				duration: 5
			}
		],
		alternativeGroups: [
			{
				id: 'quarantine-001-alt1',
				order: 1,
				codes: [['F', 'J']],
				meaning: '请发给 pratique（检疫证）',
				equivalenceLevel: 'equivalent'
			}
		],
		keyPoints: [
			'Q旗是无疫申请检疫的标准信号',
			'检疫通过后应降下Q旗',
			'如有疫情应使用FK/FL/FM等信号',
			'Q旗应在抵达检疫锚地前悬挂'
		]
	},
	{
		id: 'quarantine-002',
		category: 'quarantine',
		categoryLabel: '检疫',
		title: '船上发现疑似传染病患者',
		description: '航行途中发现船员出现高热等疑似传染病症状，抵达港口前需要编排相关检疫信号。',
		context: '船从疫区港口出发，航行中一名船员出现发热（39.5℃）、咳嗽等症状，疑似呼吸道传染病。需要向目的港卫生检疫部门报告并请求医疗援助。',
		difficulty: 'hard',
		timeLimit: 120,
		standardGroups: [
			{
				id: 'quarantine-002-g1',
				order: 1,
				codes: ['F', 'K'],
				meaning: '我船有传染病患者',
				purpose: '核心信号，表明船上存在传染病患者',
				critical: true,
				duration: 5
			},
			{
				id: 'quarantine-002-g2',
				order: 2,
				codes: ['F', 'L'],
				meaning: '我船需要隔离',
				purpose: '请求对船舶进行隔离处理',
				critical: true,
				duration: 5
			},
			{
				id: 'quarantine-002-g3',
				order: 3,
				codes: ['F', 'N'],
				meaning: '请派医生',
				purpose: '请求派遣医生上船诊疗',
				critical: false,
				duration: 3
			},
			{
				id: 'quarantine-002-g4',
				order: 4,
				codes: ['W'],
				meaning: '我需要医疗援助',
				purpose: '一般性医疗援助请求',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'quarantine-002-alt1',
				order: 1,
				codes: [['F', 'M']],
				meaning: '本船有疫情',
				equivalenceLevel: 'equivalent'
			},
			{
				id: 'quarantine-002-alt2',
				order: 3,
				codes: [['F', 'Q'], ['R', 'R', 'R']],
				meaning: '请求直升机接送病人 / 请求立即医疗援助',
				equivalenceLevel: 'acceptable'
			}
		],
		keyPoints: [
			'FK/FL/FM是检疫疫情信号，情况非常严肃',
			'发现疫情必须如实报告，不得隐瞒',
			'信号顺序：报告疫情 → 请求隔离 → 请求医疗援助',
			'应同时通过无线电报告具体情况'
		]
	},
	{
		id: 'dangerous-cargo-001',
		category: 'dangerous-cargo',
		categoryLabel: '装卸危险品',
		title: '危险品装卸作业信号',
		description: '你船正在码头进行危险货物装卸作业。请编排正确的信号以警示周围船舶。',
		context: '你船靠泊在危险品专用码头，正在装卸一级易燃液体。作业期间需要在显要位置悬挂警示信号，提醒周围船舶远离并禁止明火作业。',
		difficulty: 'easy',
		timeLimit: 60,
		standardGroups: [
			{
				id: 'dc-001-g1',
				order: 1,
				codes: ['B'],
				meaning: '我正在装卸或载运危险货物',
				purpose: '核心信号，表明正在进行危险品相关作业',
				critical: true,
				duration: 5
			}
		],
		alternativeGroups: [],
		keyPoints: [
			'B旗是危险品装卸/载运的标准信号',
			'B旗为纯红色旗帜，非常醒目',
			'危险品作业期间必须全天悬挂',
			'作业结束后方可降下B旗'
		]
	},
	{
		id: 'dangerous-cargo-002',
		category: 'dangerous-cargo',
		categoryLabel: '装卸危险品',
		title: '危险品作业中发生小范围火情',
		description: '装卸危险品过程中发生小范围火情，情况尚未失控。请编排正确的信号序列。',
		context: '装卸易燃化学品时发生泄漏并起火，船员正在使用灭火器扑救，火势暂未蔓延。码头有消防船待命，需要发送适当信号表明情况。',
		difficulty: 'medium',
		timeLimit: 90,
		standardGroups: [
			{
				id: 'dc-002-g1',
				order: 1,
				codes: ['B'],
				meaning: '我正在装卸或载运危险货物',
				purpose: '继续表明危险品作业状态',
				critical: true,
				duration: 5
			},
			{
				id: 'dc-002-g2',
				order: 2,
				codes: ['C', 'B'],
				meaning: '本船失火，船上有爆炸品',
				purpose: '表明失火并涉及危险品，警告严重风险',
				critical: true,
				duration: 5
			},
			{
				id: 'dc-002-g3',
				order: 3,
				codes: ['V'],
				meaning: '我需要援助',
				purpose: '请求必要的消防援助',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'dc-002-alt1',
				order: 2,
				codes: [['C', 'P'], ['C', 'G']],
				meaning: '本船在港内失火，请派消防船 / 本船失火，请求立即援助',
				equivalenceLevel: 'acceptable'
			}
		],
		keyPoints: [
			'危险品失火情况极为危险，CB信号优先',
			'B旗必须继续悬挂表明危险货物状态',
			'如情况恶化应升级为NC遇险信号',
			'应同时通过无线电呼叫消防援助'
		]
	},
	{
		id: 'towing-001',
		category: 'towing',
		categoryLabel: '拖带作业',
		title: '正常拖带作业信号',
		description: '你船作为拖船正在进行拖带作业。请编排正确的拖带作业信号。',
		context: '你船是专业拖轮，正在协助一艘大型集装箱船靠泊。拖带方式为顶推和吊拖结合，作业区域在港口航道内，周围船只较多。',
		difficulty: 'easy',
		timeLimit: 60,
		standardGroups: [
			{
				id: 'towing-001-g1',
				order: 1,
				codes: ['T'],
				meaning: '请让开我，我正在对拖作业',
				purpose: '核心信号，表明正在进行拖带作业，请求他船避让',
				critical: true,
				duration: 5
			},
			{
				id: 'towing-001-g2',
				order: 2,
				codes: ['D'],
				meaning: '请让开我，我操纵困难',
				purpose: '拖带作业时操纵受限，进一步请求他船避让',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'towing-001-alt1',
				order: 1,
				codes: [['T', 'T', 'T']],
				meaning: '我船正在对拖作业，请远离',
				equivalenceLevel: 'equivalent'
			}
		],
		keyPoints: [
			'T旗是拖带作业的核心信号',
			'拖带作业严重影响船舶操纵性，应同时悬挂D旗',
			'拖带期间必须持续悬挂信号',
			'作业完成后降下T旗'
		]
	},
	{
		id: 'towing-002',
		category: 'towing',
		categoryLabel: '拖带作业',
		title: '拖带作业中发生紧急情况',
		description: '拖带作业中拖缆断裂，被拖船失控。请编排正确的紧急信号序列。',
		context: '拖带大型船舶出港时，主拖缆突然断裂，被拖船失去动力开始漂移，接近航道边缘浅水区。需要立即发出紧急信号并请求其他拖船支援。',
		difficulty: 'hard',
		timeLimit: 90,
		standardGroups: [
			{
				id: 'towing-002-g1',
				order: 1,
				codes: ['B', 'H'],
				meaning: '我船失去动力',
				purpose: '表明被拖船（或拖船本身）失去动力',
				critical: true,
				duration: 5
			},
			{
				id: 'towing-002-g2',
				order: 2,
				codes: ['E', 'E', 'E'],
				meaning: '本船主机或舵机损坏需要援助',
				purpose: '说明紧急原因是机器/舵机损坏',
				critical: true,
				duration: 5
			},
			{
				id: 'towing-002-g3',
				order: 3,
				codes: ['Z'],
				meaning: '我需要一艘拖船',
				purpose: '请求额外拖船支援',
				critical: true,
				duration: 5
			},
			{
				id: 'towing-002-g4',
				order: 4,
				codes: ['U'],
				meaning: '你正在临近危险',
				purpose: '警告附近船舶注意失控漂移的危险',
				critical: false,
				duration: 3
			}
		],
		alternativeGroups: [
			{
				id: 'towing-002-alt1',
				order: 1,
				codes: [['D', 'D', 'D']],
				meaning: '本船发生碰撞需要援助',
				equivalenceLevel: 'partial'
			},
			{
				id: 'towing-002-alt2',
				order: 3,
				codes: [['B', 'A']],
				meaning: '请派拖船协助',
				equivalenceLevel: 'equivalent'
			},
			{
				id: 'towing-002-alt3',
				order: 4,
				codes: [['L']],
				meaning: '你应立即停船',
				equivalenceLevel: 'acceptable'
			}
		],
		keyPoints: [
			'拖缆断裂属于严重紧急情况，应立即发送信号',
			'EEE或BH说明船舶失控原因',
			'优先请求拖船援助（Z/BA）',
			'U旗或L旗警告周围船只避让',
			'如危及人员安全应升级为NC遇险信号'
		]
	}
];

export const getScenarioById = (id: string): ScenarioInfo | undefined => {
	return scenarios.find(s => s.id === id);
};

export const getScenariosByCategory = (category: ScenarioCategory | 'all'): ScenarioInfo[] => {
	if (category === 'all') return scenarios;
	return scenarios.filter(s => s.category === category);
};

export const getRandomScenario = (category: ScenarioCategory | 'all' = 'all'): ScenarioInfo => {
	const pool = getScenariosByCategory(category);
	return pool[Math.floor(Math.random() * pool.length)];
};
