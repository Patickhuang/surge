const REQUEST_HEADERS = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
    'Accept-Language': 'en',
}

// 即将登陆
const STATUS_COMING = 2
// 支持解锁
const STATUS_AVAILABLE = 1
// 不支持解锁
const STATUS_NOT_AVAILABLE = 0
// 检测超时
const STATUS_TIMEOUT = -1
// 检测异常
const STATUS_ERROR = -2

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36'


  ;(async () => {
    let panel_result = {
      title: '流媒体解锁检测',
      content: '',
      icon: 'sparkles.tv.fill',
      'icon-color': '#1E90FF',
    }
  let [{ region, status }] = await Promise.all([testDisneyPlus()])
    await Promise.all([check_youtube_premium(),check_netflix()])
      .then((result) => { 
         console.log(result)
 let disney_result=""
    if (status==STATUS_COMING) {
        //console.log(1)
        disney_result="Disney+: 即将登陆~"+region.toUpperCase()
      } else if (status==STATUS_AVAILABLE){
        //console.log(2)
        console.log(region)
        disney_result="Disney+: 已解锁，区域: "+region.toUpperCase()
        // console.log(result["Disney"])
      } else if (status==STATUS_NOT_AVAILABLE) {
        //console.log(3)
        disney_result="Disney+: 未支持 🚫 "
      } else if (status==STATUS_TIMEOUT) {
        disney_result="Disney+: 检测超时 🚦"
      }
result.push(disney_result)
console.log(result)
        let content = result.join('\n')
        console.log(content)
     
panel_result['content'] = content
      })
      .finally(() => {
        $done(panel_result)
      })
  })()
  async function check_youtube_premium() {
    let inner_check = () => {
      return new Promise((resolve, reject) => {
        let option = {
          url: 'https://www.youtube.com/premium',
          headers: REQUEST_HEADERS,
        }
        $httpClient.get(option, function (error, response, data) {
          if (error != null || response.status !== 200) {
            reject('Error')
            return
          }
  
          if (data.indexOf('Premium is not available in your country') !== -1) {
            resolve('Not Available')
            return
          }
  
          let region = ''
          let re = new RegExp('"countryCode":"(.*?)"', 'gm')
          let result = re.exec(data)
          if (result != null && result.length === 2) {
            region = result[1]
          } else if (data.indexOf('www.google.cn') !== -1) {
            region = 'CN'
          } else {
            region = 'US'
          }
          resolve(region)
        })
      })
    }
  
    let youtube_check_result = 'YouTube: '
  
    await inner_check()
      .then((code) => {
        if (code === 'Not Available') {
          youtube_check_result += '不支持解锁'
        } else {
          youtube_check_result += '已解锁，区域: ' + code.toUpperCase()
        }
      })
      .catch((error) => {
        youtube_check_result += '检测失败，请刷新面板'
      })
  
    return youtube_check_result
  }

  async function check_netflix() {
    let inner_check = (filmId) => {
      return new Promise((resolve, reject) => {
        let option = {
          url: 'https://www.netflix.com/title/' + filmId,
          headers: REQUEST_HEADERS,
        }
        $httpClient.get(option, function (error, response, data) {
          if (error != null) {
            reject('Error')
            return
          }
  
          if (response.status === 403) {
            reject('Not Available')
            return
          }
  
          if (response.status === 404) {
            resolve('Not Found')
            return
          }
  
          if (response.status === 200) {
            let url = response.headers['x-originating-url']
            let region = url.split('/')[3]
            region = region.split('-')[0]
            if (region == 'title') {
              region = 'us'
            }
            resolve(region)
            return
          }
  
          reject('Error')
        })
      })
    }
  
    let netflix_check_result = 'Netflix: '
  
    await inner_check(81215567)
      .then((code) => {
        if (code === 'Not Found') {
          return inner_check(80018499)
        }
        netflix_check_result += '已完整解锁，区域: ' + code.toUpperCase()
        return Promise.reject('BreakSignal')
      })
      .then((code) => {
        if (code === 'Not Found') {
          return Promise.reject('Not Available')
        }
  
        netflix_check_result += '仅解锁自制剧，区域: ' + code.toUpperCase()
        return Promise.reject('BreakSignal')
      })
      .catch((error) => {
        if (error === 'BreakSignal') {
          return
        }
        if (error === 'Not Available') {
          netflix_check_result += '该节点不支持解锁'
          return
        }
        netflix_check_result += '检测失败，请刷新面板'
      })
  
    return netflix_check_result
  }

  async function testDisneyPlus() {
    try {
        let { region, cnbl } = await Promise.race([testHomePage(), timeout(7000)])
        console.log(`homepage: region=${region}, cnbl=${cnbl}`)
        // 即将登陆
    //  if (cnbl == 2) {
    //    return { region, status: STATUS_COMING }
    //  }
        let { countryCode, inSupportedLocation } = await Promise.race([getLocationInfo(), timeout(7000)])
        console.log(`getLocationInfo: countryCode=${countryCode}, inSupportedLocation=${inSupportedLocation}`)
        
        region = countryCode ?? region
        console.log( "region:"+region)
        // 即将登陆
        if (inSupportedLocation === false || inSupportedLocation === 'false') {
          return { region, status: STATUS_COMING }
        } else {
          // 支持解锁
          return { region, status: STATUS_AVAILABLE }
        }
        
      } catch (error) {
        console.log("error:"+error)
        
        // 不支持解锁
        if (error === 'Not Available') {
          console.log("不支持")
          return { status: STATUS_NOT_AVAILABLE }
        }
        
        // 检测超时
        if (error === 'Timeout') {
          return { status: STATUS_TIMEOUT }
        }
        
        return { status: STATUS_ERROR }
      } 
      
    }
      
      function getLocationInfo() {
        return new Promise((resolve, reject) => {
          let opts = {
            url: 'https://disney.api.edge.bamgrid.com/graph/v1/device/graphql',
            headers: {
              'Accept-Language': 'en',
              Authorization: 'ZGlzbmV5JmJyb3dzZXImMS4wLjA.Cu56AgSfBTDag5NiRA81oLHkDZfu5L3CKadnefEAY84',
              'Content-Type': 'application/json',
              'User-Agent': UA,
            },
            body: JSON.stringify({
              query: 'mutation registerDevice($input: RegisterDeviceInput!) { registerDevice(registerDevice: $input) { grant { grantType assertion } } }',
              variables: {
                input: {
                  applicationRuntime: 'chrome',
                  attributes: {
                    browserName: 'chrome',
                    browserVersion: '94.0.4606',
                    manufacturer: 'apple',
                    model: null,
                    operatingSystem: 'macintosh',
                    operatingSystemVersion: '10.15.7',
                    osDeviceIds: [],
                  },
                  deviceFamily: 'browser',
                  deviceLanguage: 'en',
                  deviceProfile: 'macosx',
                },
              },
            }),
          }
      
          $httpClient.post(opts, function (error, response, data) {
            if (error) {
              reject('Error')
              return
            }
      
            if (response.status !== 200) {
              console.log('getLocationInfo: ' + data)
              reject('Not Available')
              return
            }
      
            data = JSON.parse(data)
            if(data?.errors){
              console.log('getLocationInfo: ' + data)
              reject('Not Available')
              return
            }
      
            let {
              token: { accessToken },
              session: {
                inSupportedLocation,
                location: { countryCode },
              },
            } = data?.extensions?.sdk
            resolve({ inSupportedLocation, countryCode, accessToken })
          })
        })
      }
      
      function testHomePage() {
        return new Promise((resolve, reject) => {
          let opts = {
            url: 'https://www.disneyplus.com/',
            headers: {
              'Accept-Language': 'en',
              'User-Agent': UA,
            },
          }
      
          $httpClient.get(opts, function (error, response, data) {
            if (error) {
              reject('Error')
              return
            }
            if (response.status !== 200 || data.indexOf('unavailable') !== -1) {
              reject('Not Available')
              return
            }
      
            let match = data.match(/Region: ([A-Za-z]{2})[\s\S]*?CNBL: ([12])/)
            if (!match) {
              resolve({ region: '', cnbl: '' })
              return
            }
      
            let region = match[1]
            let cnbl = match[2]
            resolve({ region, cnbl })
          })
        })
      }
      
      function timeout(delay = 5000) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            reject('Timeout')
          }, delay)
        })
      }
      function getCountryFlagEmoji(countryCode) {
        if (countryCode.toUpperCase() == 'TW') {
          countryCode = 'CN'
        }
        const codePoints = countryCode
          .toUpperCase()
          .split('')
          .map(char => 127397 + char.charCodeAt())
        return String.fromCodePoint(...codePoints)
      }
      
      function getOptions() {
        let options = Object.assign({}, DEFAULT_OPTIONS)
        if (typeof $argument != 'undefined') {
          try {
            let params = Object.fromEntries(
              $argument
                .split('&')
                .map(item => item.split('='))
                .map(([k, v]) => [k, decodeURIComponent(v)])
            )
            Object.assign(options, params)
          } catch (error) {
            console.error(`$argument 解析失败，$argument: + ${argument}`)
          }
        }
      
        return options
      }
      
      function replaceRegionPlaceholder(content, region) {
        let result = content
      
        if (result.indexOf('#REGION_CODE#') !== -1) {
          result = result.replaceAll('#REGION_CODE#', region.toUpperCase())
        }
        if (result.indexOf('#REGION_FLAG#') !== -1) {
          result = result.replaceAll('#REGION_FLAG#', getCountryFlagEmoji(region.toUpperCase()))
        }
      
        if (result.indexOf('#REGION_NAME#') !== -1) {
          result = result.replaceAll('#REGION_NAME#', RESION_NAMES?.[region.toUpperCase()]?.chinese ?? '')
        }
      
        if (result.indexOf('#REGION_NAME_EN#') !== -1) {
          result = result.replaceAll('#REGION_NAME_EN#', RESION_NAMES?.[region.toUpperCase()]?.english ?? '')
        }
      
        return result
      }
      
      // prettier-ignore
      const RESION_NAMES={AF:{chinese:"阿富汗",english:"Afghanistan",},AL:{chinese:"阿尔巴尼亚",english:"Albania",},DZ:{chinese:"阿尔及利亚",english:"Algeria",},AO:{chinese:"安哥拉",english:"Angola",},AR:{chinese:"阿根廷",english:"Argentina",},AM:{chinese:"亚美尼亚",english:"Armenia",},AU:{chinese:"澳大利亚",english:"Australia",},AT:{chinese:"奥地利",english:"Austria",},AZ:{chinese:"阿塞拜疆",english:"Azerbaijan",},BH:{chinese:"巴林",english:"Bahrain",},BD:{chinese:"孟加拉国",english:"Bangladesh",},BY:{chinese:"白俄罗斯",english:"Belarus",},BE:{chinese:"比利时",english:"Belgium",},BZ:{chinese:"伯利兹",english:"Belize",},BJ:{chinese:"贝宁",english:"Benin",},BT:{chinese:"不丹",english:"Bhutan",},BO:{chinese:"玻利维亚",english:"Bolivia",},BA:{chinese:"波斯尼亚和黑塞哥维那",english:"Bosnia and Herzegovina",},BW:{chinese:"博茨瓦纳",english:"Botswana",},BR:{chinese:"巴西",english:"Brazil",},VG:{chinese:"英属维京群岛",english:"British Virgin Islands",},BN:{chinese:"文莱",english:"Brunei",},BG:{chinese:"保加利亚",english:"Bulgaria",},BF:{chinese:"布基纳法索",english:"Burkina-faso",},BI:{chinese:"布隆迪",english:"Burundi",},KH:{chinese:"柬埔寨",english:"Cambodia",},CM:{chinese:"喀麦隆",english:"Cameroon",},CA:{chinese:"加拿大",english:"Canada",},CV:{chinese:"佛得角",english:"Cape Verde",},KY:{chinese:"开曼群岛",english:"Cayman Islands",},CF:{chinese:"中非共和国",english:"Central African Republic",},TD:{chinese:"乍得",english:"Chad",},CL:{chinese:"智利",english:"Chile",},CN:{chinese:"中国",english:"China",},CO:{chinese:"哥伦比亚",english:"Colombia",},KM:{chinese:"科摩罗",english:"Comoros",},CG:{chinese:"刚果(布)",english:"Congo - Brazzaville",},CD:{chinese:"刚果(金)",english:"Congo - Kinshasa",},CR:{chinese:"哥斯达黎加",english:"Costa Rica",},HR:{chinese:"克罗地亚",english:"Croatia",},CY:{chinese:"塞浦路斯",english:"Cyprus",},CZ:{chinese:"捷克共和国",english:"Czech Republic",},DK:{chinese:"丹麦",english:"Denmark",},DJ:{chinese:"吉布提",english:"Djibouti",},DO:{chinese:"多米尼加共和国",english:"Dominican Republic",},EC:{chinese:"厄瓜多尔",english:"Ecuador",},EG:{chinese:"埃及",english:"Egypt",},SV:{chinese:"萨尔瓦多",english:"EI Salvador",},GQ:{chinese:"赤道几内亚",english:"Equatorial Guinea",},ER:{chinese:"厄立特里亚",english:"Eritrea",},EE:{chinese:"爱沙尼亚",english:"Estonia",},ET:{chinese:"埃塞俄比亚",english:"Ethiopia",},FJ:{chinese:"斐济",english:"Fiji",},FI:{chinese:"芬兰",english:"Finland",},FR:{chinese:"法国",english:"France",},GA:{chinese:"加蓬",english:"Gabon",},GM:{chinese:"冈比亚",english:"Gambia",},GE:{chinese:"格鲁吉亚",english:"Georgia",},DE:{chinese:"德国",english:"Germany",},GH:{chinese:"加纳",english:"Ghana",},GR:{chinese:"希腊",english:"Greece",},GL:{chinese:"格陵兰",english:"Greenland",},GT:{chinese:"危地马拉",english:"Guatemala",},GN:{chinese:"几内亚",english:"Guinea",},GY:{chinese:"圭亚那",english:"Guyana",},HT:{chinese:"海地",english:"Haiti",},HN:{chinese:"洪都拉斯",english:"Honduras",},HK:{chinese:"香港",english:"Hong Kong",},HU:{chinese:"匈牙利",english:"Hungary",},IS:{chinese:"冰岛",english:"Iceland",},IN:{chinese:"印度",english:"India",},ID:{chinese:"印度尼西亚",english:"Indonesia",},IR:{chinese:"伊朗",english:"Iran",},IQ:{chinese:"伊拉克",english:"Iraq",},IE:{chinese:"爱尔兰",english:"Ireland",},IM:{chinese:"马恩岛",english:"Isle of Man",},IL:{chinese:"以色列",english:"Israel",},IT:{chinese:"意大利",english:"Italy",},CI:{chinese:"科特迪瓦",english:"Ivory Coast",},JM:{chinese:"牙买加",english:"Jamaica",},JP:{chinese:"日本",english:"Japan",},JO:{chinese:"约旦",english:"Jordan",},KZ:{chinese:"哈萨克斯坦",english:"Kazakstan",},KE:{chinese:"肯尼亚",english:"Kenya",},KR:{chinese:"韩国",english:"Korea",},KW:{chinese:"科威特",english:"Kuwait",},KG:{chinese:"吉尔吉斯斯坦",english:"Kyrgyzstan",},LA:{chinese:"老挝",english:"Laos",},LV:{chinese:"拉脱维亚",english:"Latvia",},LB:{chinese:"黎巴嫩",english:"Lebanon",},LS:{chinese:"莱索托",english:"Lesotho",},LR:{chinese:"利比里亚",english:"Liberia",},LY:{chinese:"利比亚",english:"Libya",},LT:{chinese:"立陶宛",english:"Lithuania",},LU:{chinese:"卢森堡",english:"Luxembourg",},MO:{chinese:"澳门",english:"Macao",},MK:{chinese:"马其顿",english:"Macedonia",},MG:{chinese:"马达加斯加",english:"Madagascar",},MW:{chinese:"马拉维",english:"Malawi",},MY:{chinese:"马来西亚",english:"Malaysia",},MV:{chinese:"马尔代夫",english:"Maldives",},ML:{chinese:"马里",english:"Mali",},MT:{chinese:"马耳他",english:"Malta",},MR:{chinese:"毛利塔尼亚",english:"Mauritania",},MU:{chinese:"毛里求斯",english:"Mauritius",},MX:{chinese:"墨西哥",english:"Mexico",},MD:{chinese:"摩尔多瓦",english:"Moldova",},MC:{chinese:"摩纳哥",english:"Monaco",},MN:{chinese:"蒙古",english:"Mongolia",},ME:{chinese:"黑山共和国",english:"Montenegro",},MA:{chinese:"摩洛哥",english:"Morocco",},MZ:{chinese:"莫桑比克",english:"Mozambique",},MM:{chinese:"缅甸",english:"Myanmar(Burma)",},NA:{chinese:"纳米比亚",english:"Namibia",},NP:{chinese:"尼泊尔",english:"Nepal",},NL:{chinese:"荷兰",english:"Netherlands",},NZ:{chinese:"新西兰",english:"New Zealand",},NI:{chinese:"尼加拉瓜",english:"Nicaragua",},NE:{chinese:"尼日尔",english:"Niger",},NG:{chinese:"尼日利亚",english:"Nigeria",},KP:{chinese:"朝鲜",english:"North Korea",},NO:{chinese:"挪威",english:"Norway",},OM:{chinese:"阿曼",english:"Oman",},PK:{chinese:"巴基斯坦",english:"Pakistan",},PA:{chinese:"巴拿马",english:"Panama",},PY:{chinese:"巴拉圭",english:"Paraguay",},PE:{chinese:"秘鲁",english:"Peru",},PH:{chinese:"菲律宾",english:"Philippines",},PL:{chinese:"波兰",english:"Poland",},PT:{chinese:"葡萄牙",english:"Portugal",},PR:{chinese:"波多黎各",english:"Puerto Rico",},QA:{chinese:"卡塔尔",english:"Qatar",},RE:{chinese:"留尼旺",english:"Reunion",},RO:{chinese:"罗马尼亚",english:"Romania",},RU:{chinese:"俄罗斯",english:"Russia",},RW:{chinese:"卢旺达",english:"Rwanda",},SM:{chinese:"圣马力诺",english:"San Marino",},SA:{chinese:"沙特阿拉伯",english:"Saudi Arabia",},SN:{chinese:"塞内加尔",english:"Senegal",},RS:{chinese:"塞尔维亚",english:"Serbia",},SL:{chinese:"塞拉利昂",english:"Sierra Leone",},SG:{chinese:"新加坡",english:"Singapore",},SK:{chinese:"斯洛伐克",english:"Slovakia",},SI:{chinese:"斯洛文尼亚",english:"Slovenia",},SO:{chinese:"索马里",english:"Somalia",},ZA:{chinese:"南非",english:"South Africa",},ES:{chinese:"西班牙",english:"Spain",},LK:{chinese:"斯里兰卡",english:"Sri Lanka",},SD:{chinese:"苏丹",english:"Sudan",},SR:{chinese:"苏里南",english:"Suriname",},SZ:{chinese:"斯威士兰",english:"Swaziland",},SE:{chinese:"瑞典",english:"Sweden",},CH:{chinese:"瑞士",english:"Switzerland",},SY:{chinese:"叙利亚",english:"Syria",},TW:{chinese:"台湾",english:"Taiwan",},TJ:{chinese:"塔吉克斯坦",english:"Tajikstan",},TZ:{chinese:"坦桑尼亚",english:"Tanzania",},TH:{chinese:"泰国",english:"Thailand",},TG:{chinese:"多哥",english:"Togo",},TO:{chinese:"汤加",english:"Tonga",},TT:{chinese:"特立尼达和多巴哥",english:"Trinidad and Tobago",},TN:{chinese:"突尼斯",english:"Tunisia",},TR:{chinese:"土耳其",english:"Turkey",},TM:{chinese:"土库曼斯坦",english:"Turkmenistan",},VI:{chinese:"美属维尔京群岛",english:"U.S. Virgin Islands",},UG:{chinese:"乌干达",english:"Uganda",},UA:{chinese:"乌克兰",english:"Ukraine",},AE:{chinese:"阿拉伯联合酋长国",english:"United Arab Emirates",},GB:{chinese:"英国",english:"United Kiongdom",},US:{chinese:"美国",english:"USA",},UY:{chinese:"乌拉圭",english:"Uruguay",},UZ:{chinese:"乌兹别克斯坦",english:"Uzbekistan",},VA:{chinese:"梵蒂冈城",english:"Vatican City",},VE:{chinese:"委内瑞拉",english:"Venezuela",},VN:{chinese:"越南",english:"Vietnam",},YE:{chinese:"也门",english:"Yemen",},YU:{chinese:"南斯拉夫",english:"Yugoslavia",},ZR:{chinese:"扎伊尔",english:"Zaire",},ZM:{chinese:"赞比亚",english:"Zambia",},ZW:{chinese:"津巴布韦",english:"Zimbabwe",}}
