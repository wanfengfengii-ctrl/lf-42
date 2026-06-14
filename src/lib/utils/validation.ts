import type { 
	SignalGroup, 
	ValidationResult, 
	SignalFlag, 
	DetailedValidationResult, 
	SubstituteAnalysis,
	SignalCodeInfo,
	ValidationRuleType
} from '$lib/types';
import { getFlagByCode } from '$lib/data/flags';

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
	'P': '在港内：我船即将出航，请所有人员回船\n在海上：我的网挂到障碍物',
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
	'0': '数字 0',
	'1': '数字 1',
	'2': '数字 2',
	'3': '数字 3',
	'4': '数字 4',
	'5': '数字 5',
	'6': '数字 6',
	'7': '数字 7',
	'8': '数字 8',
	'9': '数字 9',
	'S1': '第一代替旗：重复本组第一个字母或数字',
	'S2': '第二代替旗：重复本组第二个字母或数字',
	'S3': '第三代替旗：重复本组第三个字母或数字',
	'S4': '第四代替旗：重复本组第四个字母或数字',
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
	'GJ': '此区域为军事禁区',
	'AAA': '紧急信号，需要立即援助',
	'CCC': '本船遇难，请速援救',
	'DDD': '本船发生碰撞需要援助',
	'EEE': '本船主机或舵机损坏需要援助',
	'FFF': '本船失火，需要立即援助',
	'GGG': '本船搁浅，需要立即援助',
	'HHH': '本船有人需要医疗援助',
	'LLL': '你应立即停船，否则我将开炮',
	'OOO': '有人落水，请立即援救',
	'RRR': '请求立即医疗援助',
	'SOS': '求救信号，本船遇险',
	'TTT': '我船正在对拖作业，请远离',
	'UUU': '你正在临近危险，请立即避开',
	'VVV': '我需要援助，请前来救助',
	'WWW': '我需要医疗援助，请派医生',
	'YYY': '我正在走锚，请远离我',
	'ZZZ': '我需要一艘拖船，请立即派来',
	'ACE': '本船有紧急情况',
	'AID': '我需要援助',
	'BILL': '船舶账单请签字',
	'BOND': '请给我一份海关保税单',
	'CALL': '请呼叫我',
	'COME': '请到我这边来',
	'DANG': '危险',
	'FIRE': '本船失火',
	'HELP': '我需要帮助',
	'INFO': '请提供信息',
	'LOAD': '请装货',
	'PASS': '我船有通行证',
	'PILO': '请派引航员',
	'PORT': '我船将进港',
	'QUAR': '我船需要检疫',
	'READ': '我已准备就绪',
	'STOP': '请立即停船',
	'TIME': '请问标准时间',
	'UNLO': '请卸货',
	'WAIT': '请等待',
	'WATE': '我需要淡水',
	'WEAT': '请报告天气情况',
	'0A': '方位 0 度（正北）',
	'0B': '方位 10 度',
	'0C': '方位 20 度',
	'0D': '方位 30 度',
	'0E': '方位 40 度',
	'0F': '方位 50 度',
	'0G': '方位 60 度',
	'0H': '方位 70 度',
	'0I': '方位 80 度',
	'0J': '方位 90 度（正东）',
	'0K': '方位 100 度',
	'0L': '方位 110 度',
	'0M': '方位 120 度',
	'0N': '方位 130 度',
	'0O': '方位 140 度',
	'0P': '方位 150 度',
	'0Q': '方位 160 度',
	'0R': '方位 170 度',
	'0S': '方位 180 度（正南）',
	'0T': '方位 190 度',
	'0U': '方位 200 度',
	'0V': '方位 210 度',
	'0W': '方位 220 度',
	'0X': '方位 230 度',
	'0Y': '方位 240 度',
	'0Z': '方位 250 度',
	'01': '方位 260 度',
	'02': '方位 270 度（正西）',
	'03': '方位 280 度',
	'04': '方位 290 度',
	'05': '方位 300 度',
	'06': '方位 310 度',
	'07': '方位 320 度',
	'08': '方位 330 度',
	'09': '方位 340 度',
	'10': '方位 350 度'
};

const DISTRESS_SIGNALS = new Set(['AAA', 'CCC', 'DDD', 'EEE', 'FFF', 'GGG', 'HHH', 'OOO', 'RRR', 'SOS', 'VVV', 'WWW', 'NC']);
const BEARING_PATTERN = /^[0-9][A-Z0-9]$/;
const CALL_SIGN_PREFIXES = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'V', 'W', 'Z'];

export function validateSignalGroup(group: SignalGroup): ValidationResult {
	const detailed = validateSignalGroupDetailed(group);
	return {
		valid: detailed.valid,
		message: detailed.message,
		ruleViolation: detailed.ruleViolation,
		violationCode: detailed.violationCode
	};
}

export function validateSignalGroupDetailed(group: SignalGroup): DetailedValidationResult {
	const warnings: ValidationResult[] = [];
	const rulesChecked: string[] = [];

	rulesChecked.push('GROUP_SIZE');
	if (group.flags.length === 0) {
		return createValidationError(false, '信号组不能为空', 'GROUP_SIZE', 'ERR_EMPTY_GROUP');
	}
	if (group.flags.length > 5) {
		return createValidationError(
			false, 
			'信号组最多包含5面旗帜（国际信号规则第3条）', 
			'GROUP_SIZE', 
			'ERR_GROUP_TOO_LARGE'
		);
	}

	rulesChecked.push('DURATION');
	for (const sf of group.flags) {
		const durCheck = validateDuration(sf.duration);
		if (!durCheck.valid) {
			return {
				...durCheck,
				ruleViolation: 'DURATION',
				violationCode: 'ERR_INVALID_DURATION',
				warnings,
				rulesChecked
			};
		}
	}

	const codes = group.flags.map(sf => sf.flag.code);
	const nonSubstituteCodes = codes.filter(c => !isSubstituteCode(c));
	const substituteCodes = codes.filter(c => isSubstituteCode(c));

	rulesChecked.push('SUBSTITUTE_POSITION');
	if (codes[0] && isSubstituteCode(codes[0])) {
		return {
			valid: false,
			message: '代旗不能出现在信号组的第一个位置（国际信号规则第4条第1款）',
			ruleViolation: 'SUBSTITUTE_POSITION',
			violationCode: 'ERR_SUBSTITUTE_FIRST',
			warnings,
			rulesChecked
		};
	}

	rulesChecked.push('SUBSTITUTE_ONLY');
	if (substituteCodes.length > 0 && nonSubstituteCodes.length === 0) {
		return {
			valid: false,
			message: '不能只有代旗而没有原始信号（国际信号规则第4条）',
			ruleViolation: 'SUBSTITUTE_ONLY',
			violationCode: 'ERR_SUBSTITUTE_ONLY',
			warnings,
			rulesChecked
		};
	}

	rulesChecked.push('SUBSTITUTE_CONSECUTIVE');
	const consecutiveCheck = checkNoConsecutiveSubstitutes(codes);
	if (!consecutiveCheck.valid) {
		return { ...consecutiveCheck, warnings, rulesChecked };
	}

	rulesChecked.push('SUBSTITUTE_DUPLICATE');
	const duplicateSubstituteCheck = checkNoDuplicateSubstitutes(substituteCodes);
	if (!duplicateSubstituteCheck.valid) {
		return { ...duplicateSubstituteCheck, warnings, rulesChecked };
	}

	rulesChecked.push('SUBSTITUTE_REFERENCE');
	const substituteAnalysis = analyzeSubstituteUsage(group.flags);
	if (substituteAnalysis.invalidReferences.length > 0) {
		const firstInvalid = substituteAnalysis.invalidReferences[0];
		return {
			valid: false,
			message: `代旗 ${firstInvalid.code} 在第 ${firstInvalid.position + 1} 位使用无效：${firstInvalid.reason}`,
			ruleViolation: 'SUBSTITUTE_REFERENCE',
			violationCode: 'ERR_SUBSTITUTE_REF',
			warnings,
			rulesChecked,
			substituteAnalysis
		};
	}

	rulesChecked.push('DUPLICATE_WITHOUT_SUBSTITUTE');
	const dupCheck = validateNoDuplicateWithoutSubstitute(group.flags);
	if (!dupCheck.valid) {
		return { ...dupCheck, warnings, rulesChecked, substituteAnalysis };
	}

	const expandedCodes = substituteAnalysis.expandedCodes || nonSubstituteCodes;
	const combinedCode = expandedCodes.join('');

	rulesChecked.push('INVALID_SIGNAL_CODE');
	const codeInfo = analyzeSignalCode(combinedCode);
	if (!codeInfo.isStandard && expandedCodes.length >= 2) {
		if (/^[A-Z]{2,}$/.test(combinedCode)) {
			warnings.push({
				valid: true,
				message: `旗组 "${combinedCode}" 不在标准信号库中，可能为自定义呼号或专有代码`
			});
		}
	}

	rulesChecked.push('GROUP_STRUCTURE');
	const structureCheck = validateGroupStructure(group.flags, expandedCodes);
	if (!structureCheck.valid) {
		return { ...structureCheck, warnings, rulesChecked, substituteAnalysis };
	}

	return {
		valid: true,
		warnings,
		rulesChecked,
		substituteAnalysis
	};
}

function createValidationError(
	valid: boolean,
	message: string,
	ruleViolation: ValidationRuleType,
	violationCode: string
): DetailedValidationResult {
	return { valid, message, ruleViolation, violationCode };
}

function isSubstituteCode(code: string): boolean {
	return code.startsWith('S') && /^S[1-4]$/.test(code);
}

function checkNoConsecutiveSubstitutes(codes: string[]): ValidationResult {
	for (let i = 1; i < codes.length; i++) {
		if (isSubstituteCode(codes[i]) && isSubstituteCode(codes[i - 1])) {
			return {
				valid: false,
				message: `代旗不能连续使用：位置 ${i} 和 ${i + 1}（国际信号规则第4条第3款）`,
				ruleViolation: 'SUBSTITUTE_CONSECUTIVE',
				violationCode: 'ERR_SUBSTITUTE_CONSECUTIVE'
			};
		}
	}
	return { valid: true };
}

function checkNoDuplicateSubstitutes(subCodes: string[]): ValidationResult {
	const counts: Record<string, number> = {};
	for (const code of subCodes) {
		counts[code] = (counts[code] || 0) + 1;
		if (counts[code] > 1) {
			return {
				valid: false,
				message: `代旗 ${code} 在同一信号组中使用了 ${counts[code]} 次，应使用不同编号的代旗（国际信号规则第4条）`,
				ruleViolation: 'SUBSTITUTE_DUPLICATE',
				violationCode: 'ERR_SUBSTITUTE_DUPLICATE'
			};
		}
	}
	return { valid: true };
}

export function analyzeSubstituteUsage(flags: SignalFlag[]): SubstituteAnalysis {
	const codes = flags.map(sf => sf.flag.code);
	const nonSubstituteCodes = codes.filter(c => !isSubstituteCode(c));
	const substituteCodes = codes.filter(c => isSubstituteCode(c));
	const invalidReferences: SubstituteAnalysis['invalidReferences'] = [];
	let validReferences = 0;
	const expandedCodes: string[] = [];

	const uniqueNonSubstituteOrder: string[] = [];
	for (const code of nonSubstituteCodes) {
		if (!uniqueNonSubstituteOrder.includes(code)) {
			uniqueNonSubstituteOrder.push(code);
		}
	}

	for (let i = 0; i < codes.length; i++) {
		const code = codes[i];
		if (isSubstituteCode(code)) {
			const substituteNum = parseInt(code.charAt(1), 10);
			const precedingCodes = codes.slice(0, i).filter(c => !isSubstituteCode(c));
			const uniquePreceding = [...new Set(precedingCodes)];
			let reason: string | null = null;

			if (substituteNum < 1 || substituteNum > 4) {
				reason = `代旗编号无效，应为 S1-S4`;
			} else if (substituteNum > nonSubstituteCodes.length) {
				reason = `指向第 ${substituteNum} 个信号，但只有 ${nonSubstituteCodes.length} 个非代旗信号`;
			} else if (substituteNum > uniquePreceding.length) {
				reason = `指向的第 ${substituteNum} 个唯一信号不存在，前 ${i} 位只有 ${uniquePreceding.length} 个不同信号`;
			} else if (substituteNum > i) {
				reason = `只能指向其之前的信号（S1=第1位，S2=第2位...）`;
			}

			if (reason) {
				invalidReferences.push({ code, position: i, reason });
			} else {
				validReferences++;
				const targetCode = uniqueNonSubstituteOrder[substituteNum - 1];
				if (targetCode) {
					expandedCodes.push(targetCode);
				}
			}
		} else {
			expandedCodes.push(code);
		}
	}

	return {
		totalSubstitutes: substituteCodes.length,
		validReferences,
		invalidReferences,
		expandedCodes
	};
}

function validateGroupStructure(flags: SignalFlag[], expandedCodes: string[]): ValidationResult {
	if (expandedCodes.length === 0) {
		return { valid: true };
	}

	const hasLetters = expandedCodes.some(c => /^[A-Z]$/.test(c));
	const hasNumbers = expandedCodes.some(c => /^[0-9]$/.test(c));

	if (hasNumbers && expandedCodes.length >= 2) {
		const numberStartIdx = expandedCodes.findIndex(c => /^[0-9]$/.test(c));
		if (numberStartIdx >= 0) {
			for (let i = numberStartIdx; i < expandedCodes.length; i++) {
				if (!/^[0-9]$/.test(expandedCodes[i])) {
					return {
						valid: false,
						message: '数字旗应连续出现在信号组末尾（国际信号规则习惯用法）',
						ruleViolation: 'NUMBER_FLAG_ORDER',
						violationCode: 'ERR_NUM_ORDER'
					};
				}
			}
		}
	}

	return { valid: true };
}

export function isValidSignalCode(code: string): boolean {
	const info = analyzeSignalCode(code);
	return info.isStandard || /^[A-Z]{3,}$/.test(code);
}

export function analyzeSignalCode(code: string): SignalCodeInfo {
	if (!code || code.length === 0) {
		return { code, type: 'single', isStandard: false };
	}

	if (SIGNAL_MEANINGS[code]) {
		let type: SignalCodeInfo['type'] = 'single';
		let category: string | undefined;

		if (DISTRESS_SIGNALS.has(code)) {
			category = '遇险/紧急信号';
		}

		if (code.length === 1) {
			type = 'single';
		} else if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
			type = 'two-letter';
		} else if (code.length === 3 && /^[A-Z]{3}$/.test(code)) {
			type = 'three-letter';
		} else if (/^[0-9]+$/.test(code)) {
			type = 'numeric';
		} else if (BEARING_PATTERN.test(code)) {
			type = 'bearing';
			category = category || '方位信号';
		}

		return {
			code,
			type,
			isStandard: true,
			meaning: SIGNAL_MEANINGS[code],
			category
		};
	}

	if (/^[A-Z]$/.test(code)) {
		return { code, type: 'single', isStandard: true, meaning: SIGNAL_MEANINGS[code] };
	}

	if (/^[0-9]$/.test(code)) {
		return { code, type: 'single', isStandard: true, meaning: `数字 ${code}` };
	}

	if (/^[0-9]+$/.test(code)) {
		return { code, type: 'numeric', isStandard: true, meaning: `数字信号: ${code}`, category: '数字' };
	}

	if (/^[A-Z]{2}$/.test(code)) {
		return { code, type: 'two-letter', isStandard: true, category: '双字母通用信号' };
	}

	if (/^[A-Z]{3}$/.test(code)) {
		if (CALL_SIGN_PREFIXES.includes(code.charAt(0))) {
			return { code, type: 'three-letter', isStandard: true, category: '船舶呼号/船名代码' };
		}
		return { code, type: 'three-letter', isStandard: true };
	}

	if (BEARING_PATTERN.test(code)) {
		return { code, type: 'bearing', isStandard: true, category: '方位信号' };
	}

	if (/^[A-Z][0-9]$/.test(code)) {
		return { code, type: 'alphanumeric', isStandard: true, category: '字母数字组合' };
	}

	return { code, type: 'single', isStandard: false };
}

function validateNoDuplicateWithoutSubstitute(flags: SignalFlag[]): ValidationResult {
	const nonSubstituteCodes = flags
		.map(sf => sf.flag.code)
		.filter(c => !isSubstituteCode(c));

	const seen = new Map<string, number[]>();
	const problematicDuplicates: string[] = [];

	nonSubstituteCodes.forEach((code, idx) => {
		if (!seen.has(code)) {
			seen.set(code, []);
		}
		seen.get(code)!.push(idx);
	});

	for (const [code, positions] of seen.entries()) {
		if (positions.length >= 2) {
			let hasValidSubstitute = true;
			for (let i = 1; i < positions.length; i++) {
				const prevPos = positions[i - 1];
				const currPos = positions[i];
				const substituteNum = i;
				if (substituteNum > 4) {
					hasValidSubstitute = false;
					break;
				}
				const expectedSubCode = `S${substituteNum}`;
				const betweenFlags = flags.slice(prevPos + 1, currPos);
				const foundSubstitute = betweenFlags.some(sf => sf.flag.code === expectedSubCode);
				if (!foundSubstitute) {
					hasValidSubstitute = false;
					break;
				}
			}
			if (!hasValidSubstitute && !problematicDuplicates.includes(code)) {
				problematicDuplicates.push(code);
			}
		}
	}

	if (problematicDuplicates.length > 0) {
		const examples = problematicDuplicates.map(c => {
			const positions = seen.get(c)!;
			const needSubstitutes = positions.length - 1;
			const subFlags = Array.from({ length: needSubstitutes }, (_, i) => `S${i + 1}`).join('、');
			return `"${c}" 出现 ${positions.length} 次，应使用代旗 ${subFlags}`;
		}).join('；');
		return {
			valid: false,
			message: `重复信号必须使用代旗表示（国际信号规则第4条）：${examples}`,
			ruleViolation: 'DUPLICATE_WITHOUT_SUBSTITUTE',
			violationCode: 'ERR_DUP_NO_SUB'
		};
	}

	return { valid: true };
}

export function getSignalMeaning(flags: SignalFlag[]): string {
	const codes = flags.map(sf => sf.flag.code);
	const analysis = analyzeSubstituteUsage(flags);
	const expanded = analysis.expandedCodes || codes.filter(c => !isSubstituteCode(c));
	const expandedCode = expanded.join('');
	const rawCode = codes.join('');

	if (SIGNAL_MEANINGS[rawCode]) {
		return SIGNAL_MEANINGS[rawCode];
	}
	if (SIGNAL_MEANINGS[expandedCode]) {
		return SIGNAL_MEANINGS[expandedCode];
	}

	return generateGenericMeaning(expandedCode, rawCode);
}

function generateGenericMeaning(expandedCode: string, rawCode: string): string {
	if (/^[0-9]+$/.test(expandedCode)) {
		return `数字信号: ${expandedCode}`;
	}
	if (/^[A-Z]{3}$/.test(expandedCode)) {
		const callSignMeaning = getCallSignMeaning(expandedCode);
		return callSignMeaning || `呼号/船名代码: ${expandedCode}`;
	}
	if (rawCode !== expandedCode && rawCode.includes('S')) {
		const subDetails = rawCode.match(/S[1-4]/g)?.map(s => {
			const num = parseInt(s.charAt(1), 10);
			const idx = num - 1;
			const nonSub = rawCode.split(/S[1-4]/).filter(c => c.length > 0 && !c.startsWith('S'));
			const target = nonSub[idx] || `第${num}个`;
			return `${s}=${target}`;
		}).join(', ') || '';
		return `信号 ${rawCode} (展开后: ${expandedCode}${subDetails ? `, ${subDetails}` : ''})`;
	}
	return `信号 ${expandedCode}`;
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
	const codes = flags.map(sf => sf.flag.code);
	for (let i = 0; i < codes.length; i++) {
		const code = codes[i];
		if (isSubstituteCode(code)) {
			const substituteNum = parseInt(code.charAt(1), 10);
			const precedingNonSub = codes.slice(0, i).filter(c => !isSubstituteCode(c));
			const uniquePreceding = [...new Set(precedingNonSub)];
			if (i === 0) {
				return {
					valid: false,
					message: '代旗不能出现在信号组的第一个位置（国际信号规则第4条第1款）',
					ruleViolation: 'SUBSTITUTE_POSITION',
					violationCode: 'ERR_SUB_FIRST'
				};
			}
			if (substituteNum > uniquePreceding.length) {
				return {
					valid: false,
					message: `代旗 ${code} 在第 ${i + 1} 位使用：前 ${i} 位只有 ${uniquePreceding.length} 个不同的非代旗信号，无法引用第 ${substituteNum} 个`,
					ruleViolation: 'SUBSTITUTE_REFERENCE',
					violationCode: 'ERR_SUB_REF'
				};
			}
		}
	}
	return { valid: true };
}

export function validateDuration(duration: number): ValidationResult {
	if (!isFinite(duration) || isNaN(duration)) {
		return { valid: false, message: '停留时间必须是有效数字', ruleViolation: 'DURATION', violationCode: 'ERR_DUR_NAN' };
	}
	if (duration <= 0) {
		return { valid: false, message: '停留时间必须大于零', ruleViolation: 'DURATION', violationCode: 'ERR_DUR_ZERO' };
	}
	if (duration > 30) {
		return { valid: false, message: '停留时间过长（最大30秒）', ruleViolation: 'DURATION', violationCode: 'ERR_DUR_MAX' };
	}
	if (duration < 0.5) {
		return { valid: false, message: '停留时间过短（最小0.5秒）', ruleViolation: 'DURATION', violationCode: 'ERR_DUR_MIN' };
	}
	return { valid: true };
}

export function generateId(): string {
	return Math.random().toString(36).substring(2, 11);
}

export function expandSignalCodes(flags: SignalFlag[]): string[] {
	const analysis = analyzeSubstituteUsage(flags);
	return analysis.expandedCodes || flags.map(sf => sf.flag.code).filter(c => !isSubstituteCode(c));
}

export function getSubstituteUsageSummary(flags: SignalFlag[]): string {
	const analysis = analyzeSubstituteUsage(flags);
	if (analysis.totalSubstitutes === 0) return '无代旗使用';
	const parts: string[] = [];
	parts.push(`使用了 ${analysis.totalSubstitutes} 面代旗`);
	if (analysis.validReferences > 0) {
		parts.push(`${analysis.validReferences} 处有效引用`);
	}
	if (analysis.invalidReferences.length > 0) {
		parts.push(`${analysis.invalidReferences.length} 处无效引用`);
	}
	if (analysis.expandedCodes && analysis.expandedCodes.length > 0) {
		parts.push(`展开: ${analysis.expandedCodes.join(' → ')}`);
	}
	return parts.join('，');
}
