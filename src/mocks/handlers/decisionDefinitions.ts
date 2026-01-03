// MSW handlers for decision definitions endpoints
import { http, HttpResponse } from 'msw';
import { withValidation } from '../validation';

const BASE_URL = '/v1';

// Real DMN data from zenbpm test files

// Sport DRG - Multiple decisions with dependencies (Sport depends on Location, Clothes depends on Location)
const sportDmn = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:modeler="http://camunda.org/schema/modeler/1.0" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" id="drd_sports" name="drd_sports" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="5.35.0" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.5.0">
  <decision id="sport" name="Sport">
    <informationRequirement id="InformationRequirement_1kpo2dj">
      <requiredDecision href="#location" />
    </informationRequirement>
    <decisionTable id="DecisionTable_11ytwif">
      <input id="Input_1" label="equipment">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text>equipment</text>
        </inputExpression>
      </input>
      <input id="InputClause_1e9jmc5" label="location">
        <inputExpression id="LiteralExpression_05o09sy" typeRef="string">
          <text>Location.location</text>
        </inputExpression>
      </input>
      <output id="Output_1" label="sport" name="sport" typeRef="string" />
      <rule id="DecisionRule_1nszbio">
        <inputEntry id="UnaryTests_00sepg5">
          <text>"racket"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0n98pzs">
          <text>"indoor"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1hq27kc">
          <text>"squash"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_03lep47">
        <inputEntry id="UnaryTests_0d5ynj9">
          <text>"racket"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0hvfidy">
          <text>"outdoor"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0ua2mfv">
          <text>"tennis"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_0vthd5c">
        <inputEntry id="UnaryTests_0urhsza">
          <text>"club"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_094y77h">
          <text>"indoor"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0z9pnc4">
          <text>"minigolf"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_07alh1e">
        <inputEntry id="UnaryTests_0k6g8gl">
          <text>"club"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_1l4zu4p">
          <text>"outdoor"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_19lfdc4">
          <text>"golf"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="location" name="Location">
    <decisionTable id="DecisionTable_10nj353">
      <input id="InputClause_0jms81j" label="weather">
        <inputExpression id="LiteralExpression_1fdhgp3" typeRef="string">
          <text>weather</text>
        </inputExpression>
      </input>
      <output id="OutputClause_0bsor1g" name="location" typeRef="string" />
      <rule id="DecisionRule_13tngwo">
        <inputEntry id="UnaryTests_0ocos80">
          <text>"good"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0p6z5yi">
          <text>"outdoor"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_165n4nx">
        <inputEntry id="UnaryTests_1af4ldi">
          <text>"bad"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_15m09nn">
          <text>"indoor"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <decision id="clothes" name="Clothes">
    <informationRequirement id="InformationRequirement_07t9aqm">
      <requiredDecision href="#location" />
    </informationRequirement>
    <decisionTable id="DecisionTable_0y8isxr">
      <input id="InputClause_04bybxl" label="location">
        <inputExpression id="LiteralExpression_16ga6vd" typeRef="string">
          <text>Location.location</text>
        </inputExpression>
      </input>
      <input id="InputClause_0u2bd4a" label="Temperature">
        <inputExpression id="LiteralExpression_0954lxf" typeRef="string">
          <text>temperature</text>
        </inputExpression>
      </input>
      <output id="OutputClause_006erms" label="Shoes" name="shoes" typeRef="string" />
      <output id="OutputClause_1v73xal" label="Top" name="top" typeRef="string" />
      <output id="OutputClause_1grr946" label="Bottom" name="bottom" typeRef="string" />
      <output id="OutputClause_077tcf0" label="Hat" name="hat" typeRef="string" />
      <rule id="DecisionRule_0jswrge">
        <inputEntry id="UnaryTests_0ikpx2g">
          <text>"indoor"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_1k6vhpp">
          <text></text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0sx1lvy">
          <text>"Sneakers"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_1z12arw">
          <text>"Shirt"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_0mtlrec">
          <text>"Shorts"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_0n6h1ix">
          <text>""</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_1kfsnaw">
        <inputEntry id="UnaryTests_1c500y1">
          <text>"outdoor"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0v89txg">
          <text>"cold"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1pfilok">
          <text>"Boots"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_1jmxzus">
          <text>"Sweater"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_0hgxydq">
          <text>"Pants"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_0j3tie9">
          <text>"Hat"</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_01q2rff">
        <inputEntry id="UnaryTests_00xnv9d">
          <text>"outdoor"</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0uxgns3">
          <text>"warm"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_12b2ygk">
          <text>"Boots"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_19at6zb">
          <text>"Shirt"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_047g41t">
          <text>"Shorts"</text>
        </outputEntry>
        <outputEntry id="LiteralExpression_10mza0j">
          <text>""</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="sport">
        <dc:Bounds height="80" width="180" x="480" y="110" />
      </dmndi:DMNShape>
      <dmndi:DMNEdge id="DMNEdge_1s6jnjx" dmnElementRef="InformationRequirement_1kpo2dj">
        <di:waypoint x="250" y="390" />
        <di:waypoint x="570" y="210" />
        <di:waypoint x="570" y="190" />
      </dmndi:DMNEdge>
      <dmndi:DMNShape id="DMNShape_13nccsg" dmnElementRef="location">
        <dc:Bounds height="80" width="180" x="160" y="390" />
      </dmndi:DMNShape>
      <dmndi:DMNShape id="DMNShape_0f8kowp" dmnElementRef="clothes">
        <dc:Bounds height="80" width="180" x="510" y="390" />
      </dmndi:DMNShape>
      <dmndi:DMNEdge id="DMNEdge_0kvtmk4" dmnElementRef="InformationRequirement_07t9aqm">
        <di:waypoint x="340" y="430" />
        <di:waypoint x="490" y="430" />
        <di:waypoint x="510" y="430" />
      </dmndi:DMNEdge>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

// Auto Liquidation Rule - Single decision table with FIRST hit policy
const autoLiquidateDmn = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:modeler="http://camunda.org/schema/modeler/1.0" xmlns:zeebe="http://camunda.org/schema/zeebe/1.0" id="example_canAutoLiquidate" name="DRD" namespace="http://camunda.org/schema/1.0/dmn" exporter="Camunda Modeler" exporterVersion="5.35.0" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.5.0">
  <decision id="example_canAutoLiquidateRule" name="Decision of auto liquidation">
    <extensionElements>
      <zeebe:versionTag value="versionTagTest" />
    </extensionElements>
    <decisionTable id="DecisionTable_141jm3e" hitPolicy="FIRST">
      <input id="Input_1" label="Value">
        <inputExpression id="InputExpression_1" typeRef="number">
          <text>claim.amountOfDamage</text>
        </inputExpression>
      </input>
      <input id="InputClause_137jnlm" label="Insurance Type">
        <inputExpression id="LiteralExpression_1s2vd00" typeRef="string">
          <text>claim.insuranceType</text>
        </inputExpression>
      </input>
      <output id="Output_1" label="Auto Liquidation" name="canAutoLiquidate" typeRef="boolean" />
      <rule id="DecisionRule_1k1p1ib">
        <inputEntry id="UnaryTests_0jmzc3s">
          <text>&lt;= 20000</text>
        </inputEntry>
        <inputEntry id="UnaryTests_1v6fmj0">
          <text>"MAJ"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0tlpca3">
          <text>true</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_1tnkvk6">
        <inputEntry id="UnaryTests_0p7ei8o">
          <text>&lt;= 50000</text>
        </inputEntry>
        <inputEntry id="UnaryTests_0wewowu">
          <text>"POV-HAV"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1l8366w">
          <text>true</text>
        </outputEntry>
      </rule>
      <rule id="DecisionRule_0sbgnlq">
        <inputEntry id="UnaryTests_0r0473f">
          <text></text>
        </inputEntry>
        <inputEntry id="UnaryTests_0pf1p5z">
          <text></text>
        </inputEntry>
        <outputEntry id="LiteralExpression_0jjftrn">
          <text>false</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="example_canAutoLiquidateRule">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

// Mock decision definitions
interface MockDecisionDefinition {
  key: string;
  version: number;
  decisionDefinitionId: string;
  name?: string;
  resourceName?: string;
  dmnData?: string;
}

const decisionDefinitions: MockDecisionDefinition[] = [
  {
    key: '4000000000000000001',
    version: 1,
    decisionDefinitionId: 'drd_sports',
    name: 'Sports Decision',
    resourceName: 'sport.dmn',
    dmnData: sportDmn,
  },
  {
    key: '4000000000000000002',
    version: 2,
    decisionDefinitionId: 'drd_sports',
    name: 'Sports Decision',
    resourceName: 'sport.dmn',
    dmnData: sportDmn,
  },
  {
    key: '4000000000000000003',
    version: 1,
    decisionDefinitionId: 'example_canAutoLiquidate',
    name: 'Auto Liquidation Rule',
    resourceName: 'can-autoliquidate-rule.dmn',
    dmnData: autoLiquidateDmn,
  },
  {
    key: '4000000000000000004',
    version: 2,
    decisionDefinitionId: 'example_canAutoLiquidate',
    name: 'Auto Liquidation Rule',
    resourceName: 'can-autoliquidate-rule-modified.dmn',
    dmnData: autoLiquidateDmn,
  },
];

const findDecisionDefinitionByKey = (key: string) =>
  decisionDefinitions.find((dd) => dd.key === key);

export const decisionDefinitionHandlers = [
  // GET /decision-definitions - List decision definitions
  http.get(
    `${BASE_URL}/decision-definitions`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = decisionDefinitions.slice(startIndex, endIndex);

      // Map to API response format (without dmnData for list view)
      const items = paginatedItems.map(({ key, version, decisionDefinitionId, name }) => ({
        key,
        version,
        decisionDefinitionId,
        name,
      }));

      return HttpResponse.json({
        items,
        page,
        size,
        count: items.length,
        totalCount: decisionDefinitions.length,
      });
    })
  ),

  // GET /decision-definitions/:decisionDefinitionKey - Get single decision definition
  http.get(
    `${BASE_URL}/decision-definitions/:decisionDefinitionKey`,
    withValidation(({ params }) => {
      const { decisionDefinitionKey } = params;
      const definition = findDecisionDefinitionByKey(decisionDefinitionKey as string);

      if (!definition) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `Decision definition with key ${decisionDefinitionKey} not found`,
          },
          { status: 404 }
        );
      }

      return HttpResponse.json({
        key: definition.key,
        version: definition.version,
        decisionDefinitionId: definition.decisionDefinitionId,
        name: definition.name,
        resourceName: definition.resourceName,
        dmnData: definition.dmnData,
      });
    })
  ),

  // POST /decision-definitions - Deploy a new decision definition
  http.post(
    `${BASE_URL}/decision-definitions`,
    withValidation(async () => {
      const newKey = `${Date.now()}`;

      return HttpResponse.json({ decisionDefinitionKey: newKey }, { status: 201 });
    })
  ),

  // POST /decisions/:decisionId/evaluate - Evaluate a decision
  http.post(
    `${BASE_URL}/decisions/:decisionId/evaluate`,
    withValidation(async ({ params, request }) => {
      const { decisionId } = params;
      const body = (await request.json()) as {
        bindingType: string;
        variables?: Record<string, unknown>;
      };

      // Mock evaluation for sport decision
      if (decisionId === 'sport') {
        const weather = body.variables?.weather as string;
        const equipment = body.variables?.equipment as string;
        const location = weather === 'good' ? 'outdoor' : 'indoor';
        let sport = 'unknown';

        if (equipment === 'racket') {
          sport = location === 'indoor' ? 'squash' : 'tennis';
        } else if (equipment === 'club') {
          sport = location === 'indoor' ? 'minigolf' : 'golf';
        }

        return HttpResponse.json({
          evaluatedDecisions: [
            {
              decisionId: 'location',
              decisionName: 'Location',
              decisionType: 'DECISION_TABLE',
              evaluationOrder: 1,
              matchedRules: [{ ruleId: weather === 'good' ? 'DecisionRule_13tngwo' : 'DecisionRule_165n4nx', ruleIndex: weather === 'good' ? 0 : 1 }],
              decisionOutput: { location },
              evaluatedInputs: [{ inputId: 'InputClause_0jms81j', inputName: 'weather', inputValue: weather }],
            },
            {
              decisionId: 'sport',
              decisionName: 'Sport',
              decisionType: 'DECISION_TABLE',
              evaluationOrder: 2,
              matchedRules: [{ ruleId: 'DecisionRule_1nszbio', ruleIndex: 0 }],
              decisionOutput: { sport },
              evaluatedInputs: [
                { inputId: 'Input_1', inputName: 'equipment', inputValue: equipment },
                { inputId: 'InputClause_1e9jmc5', inputName: 'location', inputValue: location },
              ],
            },
          ],
          decisionOutput: { sport },
        });
      }

      // Mock evaluation for auto liquidation
      const claim = body.variables?.claim as { amountOfDamage?: number; insuranceType?: string } | undefined;
      const amount = claim?.amountOfDamage ?? 0;
      const insuranceType = claim?.insuranceType ?? '';
      let canAutoLiquidate = false;

      if (insuranceType === 'MAJ' && amount <= 20000) {
        canAutoLiquidate = true;
      } else if (insuranceType === 'POV-HAV' && amount <= 50000) {
        canAutoLiquidate = true;
      }

      return HttpResponse.json({
        evaluatedDecisions: [
          {
            decisionId: decisionId as string,
            decisionName: 'Decision of auto liquidation',
            decisionType: 'DECISION_TABLE',
            evaluationOrder: 1,
            matchedRules: [{ ruleId: canAutoLiquidate ? 'DecisionRule_1k1p1ib' : 'DecisionRule_0sbgnlq', ruleIndex: canAutoLiquidate ? 0 : 2 }],
            decisionOutput: { canAutoLiquidate },
            evaluatedInputs: [
              { inputId: 'Input_1', inputName: 'Value', inputValue: amount },
              { inputId: 'InputClause_137jnlm', inputName: 'Insurance Type', inputValue: insuranceType },
            ],
          },
        ],
        decisionOutput: { canAutoLiquidate },
      });
    })
  ),

  // GET /dmn-resource-definitions - List DMN resource definitions
  http.get(
    `${BASE_URL}/dmn-resource-definitions`,
    withValidation(({ request }) => {
      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const size = parseInt(url.searchParams.get('size') || '10', 10);
      const dmnResourceDefinitionId = url.searchParams.get('dmnResourceDefinitionId');
      const onlyLatest = url.searchParams.get('onlyLatest') === 'true';

      // Filter by dmnResourceDefinitionId if provided
      let filtered = decisionDefinitions;
      if (dmnResourceDefinitionId) {
        filtered = decisionDefinitions.filter(d => d.decisionDefinitionId === dmnResourceDefinitionId);
      }

      // Filter to only latest versions if requested
      if (onlyLatest) {
        const latestByDefId = new Map<string, MockDecisionDefinition>();
        filtered.forEach(def => {
          const existing = latestByDefId.get(def.decisionDefinitionId);
          if (!existing || def.version > existing.version) {
            latestByDefId.set(def.decisionDefinitionId, def);
          }
        });
        filtered = Array.from(latestByDefId.values());
      }

      // Paginate
      const startIndex = (page - 1) * size;
      const endIndex = startIndex + size;
      const paginatedItems = filtered.slice(startIndex, endIndex);

      // Map to DMN resource definition format (matching DmnResourceDefinitionSimple schema)
      const items = paginatedItems.map(({ key, version, decisionDefinitionId, name, resourceName }) => ({
        key,
        version,
        dmnResourceDefinitionId: decisionDefinitionId,
        name,
        resourceName,
      }));

      return HttpResponse.json({
        items,
        page,
        size,
        count: items.length,
        totalCount: filtered.length,
      });
    })
  ),

  // GET /dmn-resource-definitions/:key - Get single DMN resource definition
  http.get(
    `${BASE_URL}/dmn-resource-definitions/:dmnResourceDefinitionKey`,
    withValidation(({ params }) => {
      const { dmnResourceDefinitionKey } = params;
      const definition = findDecisionDefinitionByKey(dmnResourceDefinitionKey as string);

      if (!definition) {
        return HttpResponse.json(
          {
            code: 'NOT_FOUND',
            message: `DMN resource definition with key ${dmnResourceDefinitionKey} not found`,
          },
          { status: 404 }
        );
      }

      return HttpResponse.json({
        key: definition.key,
        version: definition.version,
        dmnResourceDefinitionId: definition.decisionDefinitionId,
        name: definition.name,
        resourceName: definition.resourceName,
        dmnData: definition.dmnData,
      });
    })
  ),
];
