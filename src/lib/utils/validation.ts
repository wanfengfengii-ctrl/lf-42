import type { SignalGroup, ValidationResult, SignalFlag } from '$lib/types';

const SIGNAL_MEANINGS: Record<string, string> = {
	'A': '我船有潜水员，请远离，慢速航行',
	'B': '我船正在装卸或运输危险货物',
	'C': '是（肯定）',
	'D': '请让开我，我操纵不灵',
	'E': '我正在向右转向',
	'F': '我船操纵失灵，请与我通信',
	'G': '我需要引航员',
	'H': '我船上有引航员',
	'I': '我正在向左转向',
	'J': '我船失火，船上有危险货物，请远离',
	'K': '我希望与你通信',
	'L': '你应立即停船',
	'M': '我船已停，不对水移动',
	'N': '不（否定）',
	'O': '有人落水',
	'P': '在港内：我船即将出航，请所有人员回船\\n在海上：我的网挂到障碍物',
	'Q': '我船没有染疫，请发给进口检疫证',
	'R': '无单独含义',
	'S': '我船正在后退',
	'T': '请让开我，我正在对拖作业',
	'U': '你正在临近危险',
	'V': '我需要援助',
	'W': '我需要医疗援助',
	'X': '请停止你的意图，留意我的信号',
	'Y': '我正在走锚',
	'Z': '我需要一艘拖船',
	'NC': '我船遇险，需要立即援助',
	'NE': '你应该立即停船',
	'CP': '本船在港内失火，请派消防船',
	'CB': '本船失火，船上有爆炸品',
	'CD': '本船失火，船上有危险品',
	'CG': '本船失火，请求立即援助',
	'MA': '请求医疗援助',
	'MB': '需要医疗药品',
	'AB': '我船正在弃船',
	'AC': '我船人员需紧急撤离',
	'AD': '我船即将沉没',
	'AN': '我船需要援助',
	'AW': '我船需要救助船',
	'AY': '我船需要救生艇',
	'BA': '请派拖船协助',
	'BD': '我船搁浅',
	'BE': '我船严重漏水',
	'BF': '我船主机损坏',
	'BG': '我船舵机损坏',
	'BH': '我船失去动力',
	'CA': '请保持距离',
	'CN': '本船即将爆炸，请远离',
	'CU': '请立即转向避开',
	'CX': '你的信号我不懂，请重发',
	'DA': '请不要追越我',
	'DB': '我船正在追越你',
	'DC': '同意追越',
	'DD': '不同意追越',
	'DE': '请减速',
	'DF': '请加速',
	'DG': '请保持航向和速度',
	'DH': '请改变航向',
	'DI': '请显示你的呼号',
	'DJ': '请报告你的船名',
	'DK': '请报告你的位置',
	'DL': '请报告你的航向',
	'DM': '请报告你的速度',
	'DN': '请报告你的目的港',
	'DO': '请报告你的ETA',
	'EA': '请开灯',
	'EB': '请关灯',
	'EC': '请鸣雾号',
	'ED': '请停止鸣雾号',
	'EE': '我正在测深',
	'EF': '我正在捕鱼',
	'EG': '我正在从事疏浚作业',
	'EH': '我正在从事水下作业',
	'EI': '请远离我，我正在作业',
	'FA': '我船需要补给燃料',
	'FB': '我船需要淡水',
	'FC': '我船需要食品',
	'FD': '我船需要修理',
	'FE': '我船需要零件',
	'FF': '我船需要装卸货物',
	'FG': '我船将在锚地抛锚',
	'FH': '我船将在泊位靠泊',
	'FI': '本船检疫结束',
	'FJ': '请发给 pratique（检疫证）',
	'FK': '我船有传染病患者',
	'FL': '我船需要隔离',
	'FM': '本船有疫情',
	'FN': '请派医生',
	'FO': '请派救护车',
	'FP': '请派直升机',
	'FQ': '请求直升机接送病人',
	'FR': '请求空中补给',
	'FS': '请求空中搜救',
	'FT': '我船需要护航',
	'FU': '请求军舰保护',
	'FV': '本船遇海盗袭击',
	'FW': '本船被劫持',
	'FX': '请求立即军事援助',
	'FY': '本船船员暴动',
	'FZ': '本船发生兵变',
	'GA': '本船将进行实弹演习',
	'GB': '请不要在此区域航行',
	'GC': '此区域有水下爆炸物',
	'GD': '此区域有水雷',
	'GE': '此区域有演习',
	'GF': '请避开此区域',
	'GG': '我正在进行扫雷作业',
	'GH': '我正在进行反潜作业',
	'GI': '此区域禁航',
	'GJ': '此区域为军事禁区'
};

export function validateSignalGroup(group: SignalGroup): ValidationResult {
	if (group.flags.length === 0) {
		return { valid: false, message: '信号组不能为空' };
	}

	if (group.flags.length > 5) {
		return { valid: false, message: '信号组最多包含5面旗帜' };
	}

	for (const sf of group.flags) {
		if (sf.duration <= 0) {
			return { valid: false, message: `旗帜 ${sf.flag.code} 的停留时间必须大于零` };
		}
	}

	const code = group.flags.map(sf => sf.flag.code).join('');
	const isValid = isValidSignalCode(code);
	
	if (!isValid) {
		return { valid: false, message: `旗组 "${code}" 不是有效的国际信号组合` };
	}

	return { valid: true };
}

export function isValidSignalCode(code: string): boolean {
	if (SIGNAL_MEANINGS[code]) {
		return true;
	}

	if (/^[A-Z]$/.test(code)) {
		return true;
	}

	if (/^[0-9]+$/.test(code)) {
		return true;
	}

	if (/^[A-Z]{2}$/.test(code)) {
		return true;
	}

	if (/^[A-Z]{3}$/.test(code)) {
		return true;
	}

	return false;
}

export function getSignalMeaning(flags: SignalFlag[]): string {
	const code = flags.map(sf => sf.flag.code).join('');
	return SIGNAL_MEANINGS[code] || generateGenericMeaning(code);
}

function generateGenericMeaning(code: string): string {
	if (/^[0-9]+$/.test(code)) {
		return `数字信号: ${code}`;
	}
	if (/^[A-Z]{3}$/.test(code)) {
		const callSignMeaning = getCallSignMeaning(code);
		return callSignMeaning || `呼号/船名代码: ${code}`;
	}
	return `信号 ${code}`;
}

function getCallSignMeaning(code: string): string | null {
	const prefix = code.charAt(0);
	const prefixMeanings: Record<string, string> = {
		'B': '中国籍船舶呼号前缀',
		'C': '智利籍船舶呼号前缀',
		'D': '德国籍船舶呼号前缀',
		'E': '西班牙籍船舶呼号前缀',
		'F': '法国籍船舶呼号前缀',
		'G': '英国籍船舶呼号前缀',
		'H': '荷兰籍船舶呼号前缀',
		'I': '意大利籍船舶呼号前缀',
		'J': '日本籍船舶呼号前缀',
		'K': '美国籍船舶呼号前缀',
		'L': '挪威籍船舶呼号前缀',
		'M': '马耳他籍船舶呼号前缀',
		'N': '巴拿马籍船舶呼号前缀',
		'O': '葡萄牙籍船舶呼号前缀',
		'P': '韩国籍船舶呼号前缀',
		'R': '俄罗斯籍船舶呼号前缀',
		'S': '瑞典籍船舶呼号前缀',
		'V': '加拿大籍船舶呼号前缀',
		'W': '美国籍船舶呼号前缀',
		'Z': '新加坡籍船舶呼号前缀'
	};
	return prefixMeanings[prefix] || null;
}

export function validateFlagOrder(flags: SignalFlag[]): ValidationResult {
	if (flags.length < 2) {
		return { valid: true };
	}

	const hasSubstitute = flags.some(sf => sf.flag.code.startsWith('S'));
	if (hasSubstitute) {
		return validateSubstituteUsage(flags);
	}

	return { valid: true };
}

function validateSubstituteUsage(flags: SignalFlag[]): ValidationResult {
	const codes = flags.map(sf => sf.flag.code);
	const nonSubstituteCodes = codes.filter(c => !c.startsWith('S'));
	const substituteCodes = codes.filter(c => c.startsWith('S'));

	if (substituteCodes.length === 0) {
		return { valid: true };
	}

	if (codes[0]?.startsWith('S')) {
		return { 
			valid: false, 
			message: '代旗不能出现在信号组的第一个位置' 
		};
	}

	for (let i = 0; i < codes.length; i++) {
		const code = codes[i];
		if (code.startsWith('S')) {
			const substituteNum = parseInt(code.charAt(1));
			
			if (isNaN(substituteNum) || substituteNum < 1 || substituteNum > 4) {
				return { 
					valid: false, 
					message: `无效的代旗编号: ${code}` 
				};
			}

			if (substituteNum > nonSubstituteCodes.length) {
				return { 
					valid: false, 
					message: `代旗 ${code} 指向第 ${substituteNum} 个信号，但只有 ${nonSubstituteCodes.length} 个非代旗信号` 
				};
			}
		}
	}

	const nonSubstituteUnique = new Set(nonSubstituteCodes);
	const hasDuplicates = nonSubstituteCodes.length !== nonSubstituteUnique.size;
	
	if (hasDuplicates && substituteCodes.length === 0) {
		return { 
			valid: false, 
			message: '重复信号必须使用代旗表示' 
		};
	}

	if (substituteCodes.length > 0 && nonSubstituteCodes.length === 0) {
		return { 
			valid: false, 
			message: '不能只有代旗而没有原始信号' 
		};
	}

	return { valid: true };
}

export function validateDuration(duration: number): ValidationResult {
	if (duration <= 0) {
		return { valid: false, message: '停留时间必须大于零' };
	}
	if (duration > 30) {
		return { valid: false, message: '停留时间过长（最大30秒）' };
	}
	return { valid: true };
}

export function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}
