import type {
	CollaborativeScenarioInfo,
	CollaborativeRole,
	CollaborativeRoleType
} from '$lib/types';
import { scenarioCategoryLabels } from './scenarios';

export const collaborativeRoles: Record<CollaborativeRoleType, CollaborativeRole> = {
	'own-ship': {
		type: 'own-ship',
		name: '本船',
		label: '本船',
		description: '扮演本船的驾驶员，负责根据本船状态发送相应信号',
		color: '#3b82f6',
		iconName: 'Ship'
	},
	'target-ship': {
		type: 'target-ship',
		name: '来船',
		label: '来船',
		description: '扮演相遇船舶的驾驶员，根据对方信号做出回应',
		color: '#f59e0b',
		iconName: 'Navigation'
	},
	'pilot-vessel': {
		type: 'pilot-vessel',
		name: '引航船',
		label: '引航船',
		description: '扮演引航船/引航员，负责引导船舶进出港',
		color: '#10b981',
		iconName: 'Anchor'
	},
	'port-control': {
		type: 'port-control',
		name: '港口调度',
		label: '港口调度',
		description: '扮演港口调度中心，协调港口内船舶交通',
		color: '#8b5cf6',
		iconName: 'Radio'
	}
};

export const collaborativeRoleLabels: Record<CollaborativeRoleType, string> = {
	'own-ship': '本船',
	'target-ship': '来船',
	'pilot-vessel': '引航船',
	'port-control': '港口调度'
};

export const collaborativeScenarios: CollaborativeScenarioInfo[] = [
	{
		id: 'collab-collision-001',
		title: '对遇局面协同避让',
		description: '两船在开阔水域构成对遇局面，需要双方协同发送避让信号',
		context: '白天能见度良好，本船与来船在航道上构成对遇局面，相距约3海里，双方均为机动船。按照《国际海上避碰规则》，双方应各自向右转向避让。',
		category: 'collision',
		categoryLabel: scenarioCategoryLabels['collision'],
		difficulty: 'easy',
		timeLimit: 180,
		minPlayers: 2,
		maxPlayers: 2,
		availableRoles: ['own-ship', 'target-ship'],
		roleTasks: {
			'own-ship': {
				roleType: 'own-ship',
				title: '本船驾驶员',
				description: '你是本船驾驶员，发现正前方有来船构成对遇局面，请按规则发送避让信号',
				visibleInfo: [
					'来船位于正前方000度方位，距离约3海里',
					'来船显示桅灯、舷灯，判断为机动船',
					'能见度良好，水域开阔',
					'你船航速12节'
				],
				requiredGroups: [
					{
						id: 'os-g1',
						order: 1,
						codes: ['D'],
						meaning: '请让开我，我操纵困难',
						purpose: '警示来船注意我船动态',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 0, latest: 60 }
					},
					{
						id: 'os-g2',
						order: 2,
						codes: ['E'],
						meaning: '我正在向右转向',
						purpose: '明确告知来船我船正在向右转向避让',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 10, latest: 90 }
					},
					{
						id: 'os-g3',
						order: 3,
						codes: ['U'],
						meaning: '你正在临近危险',
						purpose: '警示对方注意危险',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 30, latest: 120 }
					}
				]
			},
			'target-ship': {
				roleType: 'target-ship',
				title: '来船驾驶员',
				description: '你是来船驾驶员，发现正前方有本船构成对遇局面，请按规则回应避让信号',
				visibleInfo: [
					'本船位于正前方180度方位，距离约3海里',
					'本船显示桅灯、舷灯，判断为机动船',
					'能见度良好，水域开阔',
					'你船航速11节'
				],
				requiredGroups: [
					{
						id: 'ts-g1',
						order: 1,
						codes: ['D'],
						meaning: '请让开我，我操纵困难',
						purpose: '警示对方注意我船动态',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 0, latest: 60 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-g1' }
					},
					{
						id: 'ts-g2',
						order: 2,
						codes: ['E'],
						meaning: '我正在向右转向',
						purpose: '明确告知对方我船也在向右转向',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 15, latest: 100 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-g2' }
					},
					{
						id: 'ts-g3',
						order: 3,
						codes: ['S'],
						meaning: '我机器正在倒车',
						purpose: '表明正在减速以确保安全距离',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 40, latest: 140 }
					}
				]
			}
		},
		collaborationRules: [
			'双方应同时或相继表明各自的避让意图',
			'向右转向信号（E旗）必须由双方各自发出',
			'关键信号发出间隔不宜超过30秒'
		],
		idealTimeline: [
			{ id: 't1', time: 10, roleType: 'own-ship', groupCodes: ['D'], meaning: '请让开我，我操纵困难', description: '本船首先表明状态' },
			{ id: 't2', time: 15, roleType: 'target-ship', groupCodes: ['D'], meaning: '请让开我，我操纵困难', description: '来船回应表明状态' },
			{ id: 't3', time: 25, roleType: 'own-ship', groupCodes: ['E'], meaning: '我正在向右转向', description: '本船声明向右转向' },
			{ id: 't4', time: 30, roleType: 'target-ship', groupCodes: ['E'], meaning: '我正在向右转向', description: '来船同步声明向右转向' },
			{ id: 't5', time: 50, roleType: 'own-ship', groupCodes: ['U'], meaning: '你正在临近危险', description: '本船警示危险' },
			{ id: 't6', time: 60, roleType: 'target-ship', groupCodes: ['S'], meaning: '我机器正在倒车', description: '来船表明减速' }
		]
	},
	{
		id: 'collab-pilotage-001',
		title: '船舶进港引航协同',
		description: '船舶进港时，本船、引航船、港口调度三方协同完成引航作业',
		context: '外籍船舶即将抵达中国某港口引航锚地，需要申请引航。港口调度协调引航船出发，引航船抵达后引导船舶进港。',
		category: 'pilotage',
		categoryLabel: scenarioCategoryLabels['pilotage'],
		difficulty: 'medium',
		timeLimit: 240,
		minPlayers: 3,
		maxPlayers: 3,
		availableRoles: ['own-ship', 'pilot-vessel', 'port-control'],
		roleTasks: {
			'own-ship': {
				roleType: 'own-ship',
				title: '本船（外籍船舶）',
				description: '你是外籍船舶的船长，即将抵达引航锚地，需要申请引航员登轮',
				visibleInfo: [
					'距离引航锚地约10海里',
					'预计抵达时间（ETA）：30分钟后',
					'船上载有普通集装箱货物',
					'船舶吃水10.5米',
					'天气海况良好'
				],
				requiredGroups: [
					{
						id: 'os-p1',
						order: 1,
						codes: ['G'],
						meaning: '我需要引航员',
						purpose: '明确向港口表明需要引航员',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 0, latest: 60 }
					},
					{
						id: 'os-p2',
						order: 2,
						codes: ['Q'],
						meaning: '我船没有染疫，请发给进口检疫证',
						purpose: '申请入境检疫',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 10, latest: 80 }
					},
					{
						id: 'os-p3',
						order: 3,
						codes: ['P'],
						meaning: '在港内：我将要出航；在港外：我的网挂在障碍物上',
						purpose: '在港外表明准备进港状态',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 60, latest: 150 },
						dependsOn: { roleType: 'port-control', groupId: 'pc-p2' }
					},
					{
						id: 'os-p4',
						order: 4,
						codes: ['H'],
						meaning: '我船上有引航员',
						purpose: '引航员登轮后表明状态',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 120, latest: 220 },
						dependsOn: { roleType: 'pilot-vessel', groupId: 'pv-p3' }
					}
				]
			},
			'port-control': {
				roleType: 'port-control',
				title: '港口调度中心',
				description: '你是港口调度员，收到船舶引航申请后，协调引航船和安排泊位',
				visibleInfo: [
					'外籍船舶申请引航',
					'引航锚地水深充足',
					'3号泊位预计1小时后空闲',
					'引航船A轮目前在港内待命'
				],
				hiddenInfo: [
					'港口规定：外籍船舶必须强制引航',
					'引航船调度优先处理进港船舶'
				],
				requiredGroups: [
					{
						id: 'pc-p1',
						order: 1,
						codes: ['D', 'L'],
						meaning: '请报告你船的航向',
						purpose: '确认来船位置和航向',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 5, latest: 50 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-p1' }
					},
					{
						id: 'pc-p2',
						order: 2,
						codes: ['F', 'J'],
						meaning: '请发给pratique（检疫证）',
						purpose: '批准船舶检疫申请',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 30, latest: 100 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-p2' }
					},
					{
						id: 'pc-p3',
						order: 3,
						codes: ['S'],
						meaning: '我机器正在倒车',
						purpose: '指示船舶在锚地减速待泊',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 50, latest: 130 }
					}
				]
			},
			'pilot-vessel': {
				roleType: 'pilot-vessel',
				title: '引航船',
				description: '你是引航船船长，接到调度指令后前往锚地接引航员登轮',
				visibleInfo: [
					'港口调度指令：前往引航锚地接引航员',
					'目标船舶：外籍集装箱船',
					'当前距离锚地约5海里',
					'预计15分钟抵达'
				],
				requiredGroups: [
					{
						id: 'pv-p1',
						order: 1,
						codes: ['T'],
						meaning: '请让开我，我正在对拖作业',
						purpose: '引航船出航时表明作业状态',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 10, latest: 80 },
						dependsOn: { roleType: 'port-control', groupId: 'pc-p1' }
					},
					{
						id: 'pv-p2',
						order: 2,
						codes: ['D'],
						meaning: '请让开我，我操纵困难',
						purpose: '接近目标船时表明操纵受限',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 80, latest: 160 }
					},
					{
						id: 'pv-p3',
						order: 3,
						codes: ['G'],
						meaning: '我需要引航员',
						purpose: '表明引航员正在登轮',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 110, latest: 200 }
					}
				]
			}
		},
		collaborationRules: [
			'本船必须先发送G旗申请引航',
			'港口调度收到申请后协调引航船',
			'引航船抵达后本船换挂H旗',
			'检疫信号必须在引航前完成'
		],
		idealTimeline: [
			{ id: 'pt1', time: 15, roleType: 'own-ship', groupCodes: ['G'], meaning: '我需要引航员', description: '本船申请引航' },
			{ id: 'pt2', time: 25, roleType: 'own-ship', groupCodes: ['Q'], meaning: '我船没有染疫，请发给进口检疫证', description: '本船申请检疫' },
			{ id: 'pt3', time: 35, roleType: 'port-control', groupCodes: ['D', 'L'], meaning: '请报告你船的航向', description: '港口确认船舶动态' },
			{ id: 'pt4', time: 55, roleType: 'pilot-vessel', groupCodes: ['T'], meaning: '请让开我，我正在对拖作业', description: '引航船出航' },
			{ id: 'pt5', time: 70, roleType: 'port-control', groupCodes: ['F', 'J'], meaning: '请发给pratique（检疫证）', description: '港口批准检疫' },
			{ id: 'pt6', time: 95, roleType: 'own-ship', groupCodes: ['P'], meaning: '准备进港状态', description: '本船表明准备进港' },
			{ id: 'pt7', time: 100, roleType: 'port-control', groupCodes: ['S'], meaning: '我机器正在倒车', description: '港口指示减速' },
			{ id: 'pt8', time: 120, roleType: 'pilot-vessel', groupCodes: ['D'], meaning: '请让开我，我操纵困难', description: '引航船接近目标' },
			{ id: 'pt9', time: 150, roleType: 'pilot-vessel', groupCodes: ['G'], meaning: '我需要引航员', description: '引航员登轮中' },
			{ id: 'pt10', time: 170, roleType: 'own-ship', groupCodes: ['H'], meaning: '我船上有引航员', description: '本船表明引航员已登轮' }
		]
	},
	{
		id: 'collab-distress-001',
		title: '船舶遇险多方救援协同',
		description: '船舶遇险后，遇险船、附近救援船、港口调度四方协同开展救援',
		context: '一艘货船在航行中机舱起火，火势蔓延，需要立即救援。附近有一艘商船可前往救援，港口调度中心协调救援资源。',
		category: 'distress',
		categoryLabel: scenarioCategoryLabels['distress'],
		difficulty: 'hard',
		timeLimit: 300,
		minPlayers: 3,
		maxPlayers: 4,
		availableRoles: ['own-ship', 'target-ship', 'pilot-vessel', 'port-control'],
		roleTasks: {
			'own-ship': {
				roleType: 'own-ship',
				title: '遇险船（本船）',
				description: '你是遇险船船长，机舱起火需要立即发出求救信号',
				visibleInfo: [
					'机舱突然起火，火势正在蔓延',
					'消防系统正在工作但难以控制',
					'船上有25名船员',
					'距离最近港口约60海里',
					'雷达显示东南方向有一艘商船距离约15海里'
				],
				requiredGroups: [
					{
						id: 'os-d1',
						order: 1,
						codes: ['N', 'C'],
						meaning: '我船遇险，需要立即援助',
						purpose: '发出核心遇险信号',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 0, latest: 30 }
					},
					{
						id: 'os-d2',
						order: 2,
						codes: ['C', 'B'],
						meaning: '本船失火，船上有爆炸品',
						purpose: '说明遇险原因是失火',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 10, latest: 60 }
					},
					{
						id: 'os-d3',
						order: 3,
						codes: ['V'],
						meaning: '我需要援助',
						purpose: '请求一般性援助',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 20, latest: 90 }
					},
					{
						id: 'os-d4',
						order: 4,
						codes: ['W'],
						meaning: '我需要医疗援助',
						purpose: '请求医疗援助（如有伤员）',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 50, latest: 150 }
					}
				]
			},
			'target-ship': {
				roleType: 'target-ship',
				title: '附近商船（来船）',
				description: '你是附近航行的商船船长，收到遇险信号后前往救援',
				visibleInfo: [
					'收到西北方向的遇险信号',
					'距离遇险船约15海里',
					'你船可提供消防和医疗援助',
					'预计1小时抵达遇险位置'
				],
				requiredGroups: [
					{
						id: 'ts-d1',
						order: 1,
						codes: ['Z'],
						meaning: '我需要一艘拖船',
						purpose: '表明正在前往救援（可表示需要拖带援助）',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 30, latest: 120 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-d1' }
					},
					{
						id: 'ts-d2',
						order: 2,
						codes: ['A', 'N'],
						meaning: '我船需要援助',
						purpose: '响应遇险信号，表明正在前往援助',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 40, latest: 140 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-d2' }
					},
					{
						id: 'ts-d3',
						order: 3,
						codes: ['L'],
						meaning: '你应立即停船',
						purpose: '要求遇险船保持位置便于救援',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 80, latest: 200 }
					}
				]
			},
			'pilot-vessel': {
				roleType: 'pilot-vessel',
				title: '救援船（引航/拖船）',
				description: '你是港口派往救援的专业救援船（拖船），携带专业消防设备',
				visibleInfo: [
					'港口调度指令：全速前往救援遇险船',
					'船上配备专业消防设备',
					'距离遇险船约55海里',
					'预计2.5小时抵达'
				],
				requiredGroups: [
					{
						id: 'pv-d1',
						order: 1,
						codes: ['T'],
						meaning: '请让开我，我正在对拖作业',
						purpose: '表明救援船正在高速航行执行任务',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 40, latest: 150 },
						dependsOn: { roleType: 'port-control', groupId: 'pc-d1' }
					},
					{
						id: 'pv-d2',
						order: 2,
						codes: ['Z'],
						meaning: '我需要一艘拖船',
						purpose: '表明作为拖船前往救援',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 80, latest: 200 }
					}
				]
			},
			'port-control': {
				roleType: 'port-control',
				title: '港口调度中心',
				description: '你是港口调度中心，协调所有救援资源',
				visibleInfo: [
					'收到船舶遇险信号',
					'可派遣救援船、拖船、消防船',
					'可通知海事部门',
					'协调附近商船参与救援'
				],
				hiddenInfo: [
					'港口备用拖船2艘待命',
					'消防船30分钟内可出港'
				],
				requiredGroups: [
					{
						id: 'pc-d1',
						order: 1,
						codes: ['C', 'G'],
						meaning: '本船失火，请求立即援助',
						purpose: '确认遇险信息并转发救援请求',
						critical: false,
						duration: 5,
						timeWindow: { earliest: 15, latest: 80 },
						dependsOn: { roleType: 'own-ship', groupId: 'os-d1' }
					},
					{
						id: 'pc-d2',
						order: 2,
						codes: ['B', 'A'],
						meaning: '请派拖船协助',
						purpose: '派遣拖船前往救援',
						critical: true,
						duration: 5,
						timeWindow: { earliest: 30, latest: 120 }
					},
					{
						id: 'pc-d3',
						order: 3,
						codes: ['F', 'N'],
						meaning: '请派医生',
						purpose: '安排医疗救援力量',
						critical: false,
						duration: 3,
						timeWindow: { earliest: 60, latest: 180 }
					},
					{
						id: 'pc-d4',
						order: 4,
						codes: ['R', 'R', 'R'],
						meaning: '请求立即医疗援助',
						purpose: '紧急医疗援助请求',
						critical: false,
						duration: 5,
						timeWindow: { earliest: 80, latest: 200 }
					}
				]
			}
		},
		collaborationRules: [
			'遇险船必须第一时间发出NC遇险信号',
			'收到遇险信号的所有方应在30秒内响应',
			'港口调度负责协调各方救援力量',
			'附近商船应表明是否前往救援',
			'信号顺序：遇险 → 说明原因 → 请求援助 → 协调响应'
		],
		idealTimeline: [
			{ id: 'dt1', time: 10, roleType: 'own-ship', groupCodes: ['N', 'C'], meaning: '我船遇险，需要立即援助', description: '遇险船发出核心遇险信号' },
			{ id: 'dt2', time: 25, roleType: 'own-ship', groupCodes: ['C', 'B'], meaning: '本船失火，船上有爆炸品', description: '说明遇险原因' },
			{ id: 'dt3', time: 35, roleType: 'port-control', groupCodes: ['C', 'G'], meaning: '本船失火，请求立即援助', description: '港口确认并转发遇险信息' },
			{ id: 'dt4', time: 40, roleType: 'own-ship', groupCodes: ['V'], meaning: '我需要援助', description: '遇险船请求援助' },
			{ id: 'dt5', time: 55, roleType: 'port-control', groupCodes: ['B', 'A'], meaning: '请派拖船协助', description: '港口派遣拖船' },
			{ id: 'dt6', time: 65, roleType: 'target-ship', groupCodes: ['Z'], meaning: '我需要一艘拖船', description: '附近商船响应前往救援' },
			{ id: 'dt7', time: 80, roleType: 'pilot-vessel', groupCodes: ['T'], meaning: '请让开我，我正在对拖作业', description: '救援船出航' },
			{ id: 'dt8', time: 90, roleType: 'target-ship', groupCodes: ['A', 'N'], meaning: '我船需要援助', description: '商船表明正在前往援助' },
			{ id: 'dt9', time: 100, roleType: 'own-ship', groupCodes: ['W'], meaning: '我需要医疗援助', description: '遇险船请求医疗援助' },
			{ id: 'dt10', time: 110, roleType: 'port-control', groupCodes: ['F', 'N'], meaning: '请派医生', description: '港口安排医疗救援' },
			{ id: 'dt11', time: 130, roleType: 'target-ship', groupCodes: ['L'], meaning: '你应立即停船', description: '商船要求遇险船保持位置' },
			{ id: 'dt12', time: 140, roleType: 'pilot-vessel', groupCodes: ['Z'], meaning: '我需要一艘拖船', description: '救援船表明身份' },
			{ id: 'dt13', time: 150, roleType: 'port-control', groupCodes: ['R', 'R', 'R'], meaning: '请求立即医疗援助', description: '港口紧急医疗援助' }
		]
	}
];

export const getCollaborativeScenarioById = (id: string): CollaborativeScenarioInfo | undefined => {
	return collaborativeScenarios.find(s => s.id === id);
};

export const getCollaborativeScenariosByCategory = (
	category: string
): CollaborativeScenarioInfo[] => {
	if (category === 'all') return collaborativeScenarios;
	return collaborativeScenarios.filter(s => s.category === category);
};
