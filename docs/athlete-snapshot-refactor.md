Sim. Pelo snapshot, dá para reduzir bastante o custo sem perder informação relevante para a geração do plano. O principal problema não é a quantidade de dados do atleta em si, mas **redundância, precisão numérica excessiva e mistura de dados necessários com dados que o modelo consegue inferir**.

O seu snapshot atualmente tem muita informação repetida: `profile`, `historicalPerformance`, `bestEfforts`, `currentState`, `trainingPreset`, limites derivados e ainda a continuidade do plano. Por exemplo, o 5K aparece em pelo menos dois lugares, e o preset aparece praticamente duplicado. 

### 1. Remova campos que são facilmente derivados

Esse é provavelmente o maior ganho.

Hoje você manda coisas como:

```json
{
  "distanceKm": 5.714899999999999,
  "paceSecondsPerKm": 343.4880750319341,
  "estimatedTimeSeconds": 1717.4403751596706
}
```

Para o LLM, isso pode ser:

```json
{
  "d": 5.71,
  "pace": 5.72,
  "time": 28.62
}
```

Ou, melhor ainda, **não mandar tudo**.

Se o modelo já recebe:

```json
{
  "best5k": "28:37",
  "best10k": "62:20"
}
```

ele não precisa de:

* `nominalDistanceKm`
* `actualDistanceKm`
* `actualTimeSeconds`
* `paceSecondsPerKm`
* `estimatedTimeSeconds`

Grande parte disso é derivável.

---

### 2. Nunca mande `seconds` quando o modelo precisa de minutos

Você já percebeu isso no seu próprio formato: o plano usa `paceMinPerKm`, mas o snapshot usa `paceSecondsPerKm`. 

Isso custa tokens e aumenta a complexidade.

Em vez de:

```json
"averagePaceSecondsPerKm": 459.8409020096588
```

mande:

```json
"avgPace": 7.66
```

E arredonde.

Não há ganho real em mandar:

```text
459.8409020096588
```

versus:

```text
459.84
```

para decisão de treinamento.

---

### 3. Arredonde agressivamente os dados de treinamento

Seu snapshot está cheio de números assim:

```text
23.3147
9609
7.1476999999999995
355.19999999999993
412.1434116673172
```

Isso é excelente para banco de dados, mas péssimo para prompt.

Para o LLM:

```json
{
  "runs": 4,
  "km": 23.3,
  "longest": 7.1,
  "timeMin": 160,
  "elev": 355,
  "avgPace": 6.87
}
```

Você pode estabelecer uma regra no serializer:

```ts
round(distanceKm, 1)
round(paceMinPerKm, 2)
round(averageHeartRate, 0)
round(elevationGainMeters, 0)
round(durationMinutes, 0)
```

Isso reduz caracteres e, principalmente, reduz "ruído cognitivo" para o modelo.

---

### 4. Não envie todas as 12 semanas completas

Essa é provavelmente a maior oportunidade depois da remoção de redundância.

Você tem 12 semanas completas no `recentTraining`. 

Mas para criar **a próxima semana**, provavelmente você não precisa de:

```text
Semana 1
Semana 2
Semana 3
...
Semana 12
```

com todos os campos.

Você pode transformar isso em métricas agregadas:

```json
"training": {
  "avgKm12w": 16.4,
  "avgKm4w": 21.9,
  "avgRuns12w": 2.5,
  "avgRuns4w": 3,
  "weeks3PlusRuns": 7,
  "currentLongest": 12.1,
  "longest12w": 18.1,
  "volumeTrend": "up",
  "paceTrend": "down"
}
```

E manter apenas **3–4 semanas recentes** caso a tendência temporal seja importante.

Por exemplo:

```json
"recentWeeks": [
  {"runs":1,"km":6.1,"long":6.1},
  {"runs":5,"km":41.1,"long":12.1}
]
```

O modelo normalmente precisa muito mais de **estado atual + tendência** do que de todo o histórico bruto.

---

### 5. `recentActivities` pode ser muito menor

Você manda 10 atividades completas. 

Para planejamento semanal, eu provavelmente reduziria para:

```json
"recent": [
  {"date":"08-10","km":7,"pace":7.95,"effort":"easy"},
  {"date":"08-09","km":6.7,"pace":7.5,"hr":159},
  {"date":"08-07","km":12.1,"pace":6.87,"hr":171},
  {"date":"08-05","km":8.5,"pace":8.11,"hr":158}
]
```

Ou até:

```json
"lastRuns": [
  ["08-10",7,7.95],
  ["08-09",6.7,7.5,159],
  ["08-07",12.1,6.87,171],
  ["08-05",8.5,8.11,158]
]
```

E remover:

* `durationSeconds`
* `elevationGainMeters`, quando não relevante
* `maxHeartRate`
* `sufferScore`

a menos que seu algoritmo realmente use esses dados para decidir o treino.

---

### 6. Elimine duplicações explícitas

No seu snapshot, `bestEfforts.5k` e `historicalPerformance.personalBests.5k` são essencialmente o mesmo dado.

Você pode manter somente:

```json
"pb": {
  "3k": "19:15",
  "5k": "28:37",
  "10k": "62:20"
}
```

O mesmo vale para:

```json
"profile.lifetimeRunCount"
```

e

```json
"historicalPerformance.lifetimeRuns"
```

Você está enviando a mesma informação duas vezes.

---

### 7. O preset está absurdamente verboso para o que ele representa

Aqui existe bastante espaço.

Hoje você manda:

```json
{
  "id": "half_marathon_time_long",
  "goalType": "half_marathon",
  "name": "...",
  "summary": "...",
  "philosophy": "...",
  "weekTemplate": {...},
  "rules": [...]
}
```

e depois manda o mesmo preset novamente em `Estilo de treino / Preset`. 

Eu transformaria tudo em algo como:

```json
"preset": {
  "sun":"long_time",
  "mon":"easy_6k",
  "tue":"strength",
  "wed":"hard_10k",
  "thu":"strength",
  "fri":"easy",
  "sat":"rest",
  "longProgression":"60m x2 -> +10m every 2w"
}
```

Isso preserva a intenção inteira.

---

### 8. Remova `generatedAt`, `schemaVersion`, timestamps completos etc.

Para geração de treino, coisas como:

```json
"schemaVersion": 1,
"generatedAt": "2026-08-11T23:21:54.280Z",
"firstActivityAt": "2021-09-09T20:35:54.000Z"
```

provavelmente não agregam nada.

Você pode mandar:

```json
"age":24,
"weight":67.5,
"height":173
```

e pronto.

---

### 9. Transforme `currentState` no verdadeiro "estado do atleta"

Na prática, essa é a parte mais importante do snapshot.

Você já tem isso praticamente pronto:

```json
"currentState": {
  "weeklyVolumeKm": {
    "average12w": 16.35,
    "average4w": 21.86,
    "currentWeek": 7
  },
  "frequency": {
    "averageRunsPerWeek12w": 2.5,
    "averageRunsPerWeek4w": 3
  },
  "longRun": {
    "currentLongestKm": 12.14,
    "averageKm12w": 7.79
  },
  "consistency": {
    "weeksWithAtLeast3Runs": 7,
    "totalWeeks": 12
  },
  "trends": {
    "volume": "increasing",
    "pace": "declining"
  }
}
```

Eu faria isso ser a **fonte principal** do modelo.

---

## 10. Uma arquitetura que eu usaria

Eu dividiria o prompt em 4 blocos:

### Athlete

```json
{
  "age":24,
  "weight":67.5,
  "height":173,
  "goal":"half_marathon",
  "target":"1:59:00",
  "raceDate":"2026-11-22"
}
```

### Fitness

```json
{
  "pb":{"5k":"28:37","10k":"1:02:20"},
  "longest":18.1,
  "avgKm4w":21.9,
  "avgKm12w":16.4,
  "runsPerWeek4w":3,
  "weeks3PlusRuns":7,
  "volumeTrend":"up",
  "paceTrend":"down",
  "hrCoverage":48
}
```

### Recent

```json
[
  {"d":"08-10","km":7,"p":7.95,"effort":"too_easy"},
  {"d":"08-09","km":6.7,"p":7.5,"hr":159},
  {"d":"08-07","km":12.1,"p":6.87,"hr":171},
  {"d":"08-05","km":8.5,"p":8.11,"hr":158}
]
```

### Constraints

```json
{
  "easyMin":7.44,
  "workMin":5.61,
  "anchor5k":5.72
}
```

E o preset:

```json
{
  "sun":"long_time",
  "mon":"easy_6k",
  "tue":"strength",
  "wed":"hard_10k",
  "thu":"strength",
  "fri":"easy",
  "sat":"free",
  "longProgression":"60m x2, then +10m x2"
}
```

---

# E ainda dá para reduzir mais: usar um formato compacto

Você nem precisa usar JSON completo.

Como o consumidor é um LLM, algo assim pode ser muito mais barato:

```text
ATHLETE
age=24 wt=67.5 h=173
goal=HM target=1:59:00 race=2026-11-22

FITNESS
5k=28:37 10k=1:02:20 longest=18.1km
avg4w=21.9km avg12w=16.4km
runs/wk4=3 runs/wk12=2.5
3+run_weeks=7/12
volume=up pace=down hrCoverage=48%

RECENT
08-10 7km 7.95/km easy
08-09 6.7km 7.50/km HR159
08-07 12.1km 6.87/km HR171
08-05 8.5km 8.11/km HR158

PACE_RULES
easy/long >=7.44
work >=5.61
5k_anchor=5.72

PRESET
Sun=long_time
Mon=easy_6k
Tue=strength
Wed=hard_10k
Thu=strength
Fri=easy
Sat=free
Long=60m x2,+10m x2
```

Isso é **muito mais adequado para um prompt** do que o JSON bruto atual.

---

## Minha estimativa de onde está o desperdício

No seu caso eu atacaria nesta ordem:

| Mudança                                               | Economia potencial |
| ----------------------------------------------------- | -----------------: |
| Remover duplicação do preset                          |         muito alta |
| Remover `historicalPerformance` duplicado             |               alta |
| Substituir 12 semanas por agregados + últimas semanas |         muito alta |
| Reduzir `recentActivities`                            |               alta |
| Arredondar números                                    |              média |
| Remover campos derivados                              |         média/alta |
| Converter `seconds` → valores legíveis                |              média |
| Remover metadata                                      |              baixa |
| JSON compacto / formato textual                       |              média |

**Eu esperaria conseguir cortar algo como 50–75% do snapshot sem perder informação relevante para a decisão de treino.**

E tem uma melhoria arquitetural ainda mais importante: **não mandar para o LLM dados que o seu backend já consegue transformar em "features"**. Em vez de pedir para o modelo analisar 164 corridas, seu backend deveria entregar algo próximo de:

> "Volume subindo, frequência 3x/semana, longão atual 12.1 km, melhor 5k 28:37, melhor 10k 1:02:20, última semana 41 km, último longão 12.1 km, 2 últimos treinos foram..."

Isso deixa o LLM responsável por **decidir o treino**, não por fazer ETL/análise estatística antes de decidir.

```
Janela do plano: 2026-08-11 → 2026-08-17

ATHLETE
age=24
weight=67.5kg
height=173cm
lifetimeRuns=164
lifetimeDistance=818.9km
firstActivity=2021-09-09

GOAL
type=half_marathon
distance=21.1km
targetTime=1:59:00
targetDate=2026-11-22
weeksRemaining=14

CURRENT_STATE
weeklyVolume.avg12w=16.4km
weeklyVolume.avg4w=21.9km
weeklyVolume.currentWeek=7.0km
runsPerWeek.avg12w=2.5
runsPerWeek.avg4w=3
longRun.current=12.1km
longRun.avg12w=7.8km
consistency=7/12 weeks with >=3 runs
volumeTrend=increasing
paceTrend=declining
hrCoverage=48%

PERFORMANCE
PB3k=19:15 (3.4km)
PB5k=28:37 (5.71km)
PB10k=1:02:20 (10.24km)
currentLongest=18.1km (1:59:33, 6:35/km)
recent5kHR=168
recent10kHR=175

RECENT_WEEKS
2026-05-18 runs=3 km=16.2 long=6.3 pace=6.27/km elev=150
2026-05-25 runs=4 km=23.3 long=7.1 pace=6.87/km elev=355 suffer=36
2026-06-01 runs=2 km=23.5 long=18.1 pace=6.48/km elev=154 walk=1.9km suffer=308
2026-06-08 runs=1 km=1.9 long=1.9 pace=7.90/km elev=16
2026-06-15 runs=3 km=19.8 long=7.4 pace=6.81/km elev=322 HR=164 suffer=82
2026-06-22 runs=3 km=15.2 long=5.8 pace=6.87/km elev=234 HR=161 suffer=147
2026-06-29 runs=0
2026-07-06 runs=2 km=8.9 long=4.7 pace=6.20/km elev=106 HR=168 suffer=128
2026-07-13 runs=3 km=24.5 long=10.2 pace=6.49/km elev=198 HR=167 suffer=263
2026-07-20 runs=3 km=15.8 long=5.8 pace=5.87/km elev=144 HR=159 walk=2.2km suffer=157
2026-07-27 runs=1 km=6.1 long=6.1 pace=6.57/km elev=53 HR=156 suffer=56
2026-08-03 runs=5 km=41.1 long=12.1 pace=7.66/km elev=496 HR=162 walk=3.7km suffer=484

RECENT_ACTIVITIES
2026-08-10 7.00km 7.95/km effort=too_easy
2026-08-09 6.68km 7.50/km HR=159 max=179 suffer=81
2026-08-07 12.14km 6.87/km HR=171 max=186 suffer=209
2026-08-05 8.45km 8.11/km HR=158 max=183 suffer=105
2026-08-03 6.35km 7.87/km elev=113
2026-08-03 7.46km 8.43/km HR=156 max=182 suffer=89
2026-07-27 6.06km 6.57/km HR=156 max=188 suffer=56
2026-07-22 4.27km 6.02/km HR=163 max=186 suffer=49
2026-07-21 5.84km 5.91/km HR=148 max=184 suffer=30
2026-07-20 5.71km 5.72/km HR=168 max=189 suffer=78

PACE_RULES
anchor5k=5.72min/km
easyRecoveryLong.min=7.44min/km
work.min=5.61min/km
doNotInventRacePace=true
note: 345s/km=5.75min/km; 510s/km=8.50min/km

TRAINING_PRESET
id=half_marathon_time_long
sun=long_run_by_time
mon=easy_6km
tue=strength_or_rest
wed=hard_10km
thu=strength_or_rest
fri=very_easy
sat=free

LONG_RUN_PROGRESSION
weeks1-2=60min
weeks3-4=70min
then=+10min every 2 weeks

PRESET_RULES
sun=track by time, not distance
mon=easy ~6km
tue/thu=no running; strength/rest
wed=10km hard/fastest possible
fri=very easy/chill
sat=rest or optional very easy

PLAN_CONTINUITY
week=2026-08-11 → 2026-08-17
completed=none

2026-08-11
type=rest
title=Descanso e Fortalecimento
purpose=fortalecimento muscular e recuperação ativa
notes=core + membros inferiores sem corrida; hidratação

2026-08-12
type=tempo
title=Ritmo Forte 10k
purpose=desenvolver resistência de limiar
segments:
warmup 1.5km @7.50/km
work 10km @5.65/km
cooldown 1km @7.50/km
notes=ritmo forte e constante; aquecer bem

2026-08-13
type=rest
title=Descanso e Fortalecimento
purpose=recuperação + força
notes=sem impacto; treino de força/recuperação

2026-08-14
type=easy
title=Corrida Regenerativa Leve
purpose=soltar as pernas
segments=5km @7.50/km
notes=confortável, conversação, sem forçar

2026-08-15
type=rest
title=Descanso Ativo ou Livre
purpose=preparação para o longão
notes=descanso + sono

2026-08-16
type=long_run
title=Longão por Tempo (70 min)
purpose=resistência aeróbica para meia maratona
segments=70min @7.50/km
notes=correr por 70min, ignorar distância, ritmo confortável

2026-08-17
type=easy
title=Corrida Leve de Segunda
purpose=recuperar do longão
segments=6km @7.50/km
notes=ritmo leve e controlado
```