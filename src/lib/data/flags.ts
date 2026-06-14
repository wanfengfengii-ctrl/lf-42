import type { Flag } from '$lib/types';

export const letterFlags: Flag[] = [
	{
		id: 'alpha',
		code: 'A',
		name: 'Alpha',
		meaning: '我下面有潜水员，请慢速远离我',
		colors: ['#FFFFFF', '#0033A0'],
		pattern: 'diagonal',
		phonetic: '/ˈælfə/'
	},
	{
		id: 'bravo',
		code: 'B',
		name: 'Bravo',
		meaning: '我正在装卸或载运危险货物',
		colors: ['#D80027'],
		pattern: 'solid',
		phonetic: '/ˈbrɑːvoʊ/'
	},
	{
		id: 'charlie',
		code: 'C',
		name: 'Charlie',
		meaning: '是（肯定）',
		colors: ['#0033A0', '#FFFFFF', '#0033A0'],
		pattern: 'horizontal',
		phonetic: '/ˈtʃɑːrli/'
	},
	{
		id: 'delta',
		code: 'D',
		name: 'Delta',
		meaning: '请让开我，我操纵困难',
		colors: ['#FFD700', '#0033A0', '#FFD700'],
		pattern: 'horizontal',
		phonetic: '/ˈdeltə/'
	},
	{
		id: 'echo',
		code: 'E',
		name: 'Echo',
		meaning: '我正在向右转向',
		colors: ['#0033A0', '#D80027'],
		pattern: 'horizontal',
		phonetic: '/ˈekoʊ/'
	},
	{
		id: 'foxtrot',
		code: 'F',
		name: 'Foxtrot',
		meaning: '我操纵失灵，请与我通信',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'diagonal',
		phonetic: '/ˈfɒkstrɒt/'
	},
	{
		id: 'golf',
		code: 'G',
		name: 'Golf',
		meaning: '我需要引航员',
		colors: ['#0033A0', '#FFD700'],
		pattern: 'checker',
		phonetic: '/ɡɒlf/'
	},
	{
		id: 'hotel',
		code: 'H',
		name: 'Hotel',
		meaning: '我船上有引航员',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'vertical',
		phonetic: '/hoʊˈtel/'
	},
	{
		id: 'india',
		code: 'I',
		name: 'India',
		meaning: '我正在向左转向',
		colors: ['#FFD700', '#000000'],
		pattern: 'solid',
		phonetic: '/ˈɪndiə/'
	},
	{
		id: 'juliett',
		code: 'J',
		name: 'Juliett',
		meaning: '我船失火，并且船上有危险货物，请远离我',
		colors: ['#0033A0'],
		pattern: 'solid',
		phonetic: '/ˈdʒuːliət/'
	},
	{
		id: 'kilo',
		code: 'K',
		name: 'Kilo',
		meaning: '我希望与你通信',
		colors: ['#FFD700', '#0033A0'],
		pattern: 'vertical',
		phonetic: '/ˈkiːloʊ/'
	},
	{
		id: 'lima',
		code: 'L',
		name: 'Lima',
		meaning: '你应立即停船',
		colors: ['#FFD700', '#000000'],
		pattern: 'checker',
		phonetic: '/ˈliːmə/'
	},
	{
		id: 'mike',
		code: 'M',
		name: 'Mike',
		meaning: '我船已停，并不对水移动',
		colors: ['#FFFFFF', '#0033A0'],
		pattern: 'saltire',
		phonetic: '/maɪk/'
	},
	{
		id: 'november',
		code: 'N',
		name: 'November',
		meaning: '不（否定）',
		colors: ['#0033A0', '#FFFFFF'],
		pattern: 'checker',
		phonetic: '/noʊˈvembər/'
	},
	{
		id: 'oscar',
		code: 'O',
		name: 'Oscar',
		meaning: '有人落水',
		colors: ['#FFD700', '#D80027'],
		pattern: 'vertical',
		phonetic: '/ˈɒskər/'
	},
	{
		id: 'papa',
		code: 'P',
		name: 'Papa',
		meaning: '在港内：我将要出航；在港外：我的网挂在障碍物上',
		colors: ['#0033A0', '#FFFFFF'],
		pattern: 'canton',
		phonetic: '/pəˈpɑː/'
	},
	{
		id: 'quebec',
		code: 'Q',
		name: 'Quebec',
		meaning: '我船没有染疫，请发给进口检疫证',
		colors: ['#FFD700'],
		pattern: 'solid',
		phonetic: '/kwɪˈbek/'
	},
	{
		id: 'romeo',
		code: 'R',
		name: 'Romeo',
		meaning: '我船本船请求与你通信',
		colors: ['#D80027', '#FFD700'],
		pattern: 'cross',
		phonetic: '/ˈroʊmiˌoʊ/'
	},
	{
		id: 'sierra',
		code: 'S',
		name: 'Sierra',
		meaning: '我机器正在倒车',
		colors: ['#FFFFFF', '#0033A0'],
		pattern: 'canton',
		phonetic: '/siˈerə/'
	},
	{
		id: 'tango',
		code: 'T',
		name: 'Tango',
		meaning: '请让开我，我正在对拖作业',
		colors: ['#D80027', '#FFFFFF', '#0033A0'],
		pattern: 'vertical',
		phonetic: '/ˈtæŋɡoʊ/'
	},
	{
		id: 'uniform',
		code: 'U',
		name: 'Uniform',
		meaning: '你正在临近危险',
		colors: ['#D80027', '#FFFFFF'],
		pattern: 'checker',
		phonetic: '/ˈjuːnɪfɔːrm/'
	},
	{
		id: 'victor',
		code: 'V',
		name: 'Victor',
		meaning: '我需要援助',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'saltire',
		phonetic: '/ˈvɪktər/'
	},
	{
		id: 'whiskey',
		code: 'W',
		name: 'Whiskey',
		meaning: '我需要医疗援助',
		colors: ['#0033A0', '#FFFFFF', '#D80027'],
		pattern: 'canton',
		phonetic: '/ˈwɪski/'
	},
	{
		id: 'xray',
		code: 'X',
		name: 'Xray',
		meaning: '停止你的意图，注意我',
		colors: ['#FFFFFF', '#0033A0'],
		pattern: 'cross',
		phonetic: '/ˈeksreɪ/'
	},
	{
		id: 'yankee',
		code: 'Y',
		name: 'Yankee',
		meaning: '我正在走锚',
		colors: ['#FFD700', '#D80027'],
		pattern: 'diagonal',
		phonetic: '/ˈjæŋki/'
	},
	{
		id: 'zulu',
		code: 'Z',
		name: 'Zulu',
		meaning: '我需要一艘拖船',
		colors: ['#0033A0', '#FFD700', '#D80027', '#000000'],
		pattern: 'diagonal',
		phonetic: '/ˈzuːluː/'
	}
];

export const numberFlags: Flag[] = [
	{
		id: 'zero',
		code: '0',
		name: 'Zero',
		meaning: '数字 0',
		colors: ['#0033A0', '#FFD700'],
		pattern: 'cross',
		phonetic: '/ˈzɪəroʊ/'
	},
	{
		id: 'one',
		code: '1',
		name: 'One',
		meaning: '数字 1',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'cross',
		phonetic: '/wʌn/'
	},
	{
		id: 'two',
		code: '2',
		name: 'Two',
		meaning: '数字 2',
		colors: ['#0033A0', '#FFFFFF'],
		pattern: 'cross',
		phonetic: '/tuː/'
	},
	{
		id: 'three',
		code: '3',
		name: 'Three',
		meaning: '数字 3',
		colors: ['#0033A0', '#FFFFFF', '#D80027'],
		pattern: 'horizontal',
		phonetic: '/θriː/'
	},
	{
		id: 'four',
		code: '4',
		name: 'Four',
		meaning: '数字 4',
		colors: ['#D80027', '#FFFFFF'],
		pattern: 'cross',
		phonetic: '/fɔːr/'
	},
	{
		id: 'five',
		code: '5',
		name: 'Five',
		meaning: '数字 5',
		colors: ['#FFD700', '#0033A0'],
		pattern: 'cross',
		phonetic: '/faɪv/'
	},
	{
		id: 'six',
		code: '6',
		name: 'Six',
		meaning: '数字 6',
		colors: ['#000000', '#FFFFFF', '#D80027'],
		pattern: 'vertical',
		phonetic: '/sɪks/'
	},
	{
		id: 'seven',
		code: '7',
		name: 'Seven',
		meaning: '数字 7',
		colors: ['#D80027', '#FFD700'],
		pattern: 'horizontal',
		phonetic: '/ˈsevən/'
	},
	{
		id: 'eight',
		code: '8',
		name: 'Eight',
		meaning: '数字 8',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'horizontal',
		phonetic: '/eɪt/'
	},
	{
		id: 'nine',
		code: '9',
		name: 'Nine',
		meaning: '数字 9',
		colors: ['#FFFFFF', '#0033A0', '#D80027'],
		pattern: 'vertical',
		phonetic: '/naɪn/'
	}
];

export const substituteFlags: Flag[] = [
	{
		id: 'substitute-one',
		code: 'S1',
		name: 'First Substitute',
		meaning: '第一代替旗：重复本组第一个字母或数字',
		colors: ['#FFD700', '#0033A0'],
		pattern: 'horizontal',
		phonetic: '/fɜːrst ˈsʌbstɪtuːt/'
	},
	{
		id: 'substitute-two',
		code: 'S2',
		name: 'Second Substitute',
		meaning: '第二代替旗：重复本组第二个字母或数字',
		colors: ['#0033A0', '#FFFFFF'],
		pattern: 'cross',
		phonetic: '/ˈsekənd ˈsʌbstɪtuːt/'
	},
	{
		id: 'substitute-three',
		code: 'S3',
		name: 'Third Substitute',
		meaning: '第三代替旗：重复本组第三个字母或数字',
		colors: ['#FFFFFF', '#D80027'],
		pattern: 'saltire',
		phonetic: '/θɜːrd ˈsʌbstɪtuːt/'
	},
	{
		id: 'substitute-four',
		code: 'S4',
		name: 'Fourth Substitute',
		meaning: '第四代替旗：重复本组第四个字母或数字',
		colors: ['#000000', '#FFFFFF'],
		pattern: 'diagonal',
		phonetic: '/fɔːrθ ˈsʌbstɪtuːt/'
	}
];

export const allFlags: Flag[] = [...letterFlags, ...numberFlags, ...substituteFlags];

export const getFlagById = (id: string): Flag | undefined => {
	return allFlags.find((flag) => flag.id === id);
};

export const getFlagByCode = (code: string): Flag | undefined => {
	return allFlags.find((flag) => flag.code === code);
};
