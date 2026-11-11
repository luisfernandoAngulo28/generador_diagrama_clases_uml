import { describe, expect, it } from 'vitest';
import { renderXmi } from './xmi.util.js';
import { parseXmi } from './xmi-import.util.js';
import type { UmlModel } from './uml.types.js';

describe('parseXmi', () => {
  it('round-trips a model exported by renderXmi', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Pedido',
          attributes: [
            { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
            { name: 'total', type: 'Double', visibility: 'private' },
          ],
          operations: [{ name: 'confirmar', returnType: 'void', visibility: 'public' }],
        },
        {
          id: 'c2',
          name: 'Cliente',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
      ],
      relations: [
        {
          id: 'r1',
          type: 'ONE_TO_MANY',
          sourceClassId: 'c2',
          targetClassId: 'c1',
          sourceRole: 'pedidos',
        },
        { id: 'r2', type: 'DEPENDENCY', sourceClassId: 'c1', targetClassId: 'c2' },
      ],
    };

    const xml = renderXmi('Ventas', model);
    const { name, model: parsed } = parseXmi(xml);

    expect(name).toBe('Ventas');
    expect(parsed.classes).toHaveLength(2);

    const pedido = parsed.classes.find((c) => c.name === 'Pedido');
    expect(pedido?.attributes).toEqual([
      { name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true },
      { name: 'total', type: 'Double', visibility: 'private', isPrimaryKey: undefined },
    ]);
    expect(pedido?.operations).toEqual([
      { name: 'confirmar', returnType: 'void', visibility: 'public' },
    ]);

    expect(parsed.relations).toHaveLength(2);
    const oneToMany = parsed.relations.find((r) => r.type === 'ONE_TO_MANY');
    expect(oneToMany?.sourceRole).toBe('pedidos');
    const dependency = parsed.relations.find((r) => r.type === 'DEPENDENCY');
    expect(dependency).toBeTruthy();
  });

  it('infers a relation type from multiplicities when there is no name hint', () => {
    const foreignXmi = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="Externo">
    <packagedElement xmi:type="uml:Class" xmi:id="A" name="Autor">
      <ownedAttribute xmi:id="A_id" name="id" visibility="private" type="Long"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Class" xmi:id="B" name="Libro">
      <ownedAttribute xmi:id="B_id" name="id" visibility="private" type="Long"/>
    </packagedElement>
    <packagedElement xmi:type="uml:Association" xmi:id="R1">
      <memberEnd xmi:idref="R1_src"/>
      <memberEnd xmi:idref="R1_tgt"/>
      <ownedEnd xmi:id="R1_src" type="A">
        <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="*"/>
      </ownedEnd>
      <ownedEnd xmi:id="R1_tgt" type="B">
        <lowerValue xmi:type="uml:LiteralInteger" value="0"/>
        <upperValue xmi:type="uml:LiteralUnlimitedNatural" value="*"/>
      </ownedEnd>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;

    const { model } = parseXmi(foreignXmi);
    expect(model.classes.map((c) => c.name)).toEqual(['Autor', 'Libro']);
    expect(model.relations).toEqual([
      expect.objectContaining({ type: 'MANY_TO_MANY', sourceClassId: 'A', targetClassId: 'B' }),
    ]);
  });

  it('rejects a file with no uml:Model element', () => {
    expect(() => parseXmi('<not-xmi/>')).toThrow(/XMI válido/);
  });

  it('rejects a file with no classes', () => {
    const empty = `<xmi:XMI xmi:version="2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" xmi:id="model_1" name="Vacio"></uml:Model>
</xmi:XMI>`;
    expect(() => parseXmi(empty)).toThrow(/No se encontraron clases/);
  });

  it('exports a class → «interface» relation as a uml:Realization and imports it back', () => {
    const model: UmlModel = {
      classes: [
        { id: 'c1', name: 'Pago', attributes: [] },
        { id: 'c2', name: 'Notificable', stereotype: 'interface', attributes: [] },
        { id: 'c3', name: 'PagoQr', attributes: [] },
      ],
      relations: [
        { id: 'r1', type: 'INHERITANCE', sourceClassId: 'c1', targetClassId: 'c2' },
        { id: 'r2', type: 'INHERITANCE', sourceClassId: 'c3', targetClassId: 'c1' },
      ],
    };

    const xml = renderXmi('Realizacion', model);
    expect(xml).toContain('xmi:type="uml:Realization" xmi:id="real_id_r1" client="id_c1" supplier="id_c2"');
    expect(xml).toContain('<properties ea_type="Realisation"');
    expect(xml).toContain('xmi:type="uml:Generalization" general="id_c1"');
    expect(xml).not.toContain('general="id_c2"');

    const { model: parsed } = parseXmi(xml);
    const rels = parsed.relations.map((r) => `${r.type}:${r.sourceClassId}->${r.targetClassId}`);
    expect(rels).toEqual(expect.arrayContaining(['INHERITANCE:id_c1->id_c2', 'INHERITANCE:id_c3->id_c1']));
  });

  it('includes the Enterprise Architect diagram (positions and connectors) and keeps the name', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Cliente',
          attributes: [{ name: 'nombre', type: 'String', visibility: 'private' }],
          position: { x: -50, y: 20 },
        },
        {
          id: 'c2',
          name: 'Venta',
          attributes: [],
          operations: [
            { name: 'calcular', returnType: 'Double', visibility: 'public', parameters: 'iva: Double' },
          ],
          position: { x: 250, y: 300 },
        },
      ],
      relations: [{ id: 'r1', type: 'ONE_TO_MANY', sourceClassId: 'c1', targetClassId: 'c2' }],
    };

    const xml = renderXmi('Mi Diagrama', model);
    // EA only rebuilds the diagram when the file declares it as exporter
    expect(xml).toContain('<xmi:Documentation exporter="Enterprise Architect"');
    expect(xml).toContain('<properties name="Mi Diagrama" type="Logical"/>');
    // layout shifted so the left-most class starts at x = 40
    expect(xml).toContain('geometry="Left=40;Top=60;Right=220;');
    expect(xml).toContain('subject="id_c2" seqno="2"');
    expect(xml).toContain('<connector xmi:idref="id_r1">');
    expect(xml).toContain('<type multiplicity="0..*" aggregation="none"/>');
    // types as UML primitive references, not as extra elements of the package
    expect(xml).not.toContain('uml:PrimitiveType" xmi:id=');
    expect(xml).not.toContain('name="one_to_many"');

    const { name, model: parsed } = parseXmi(xml);
    expect(name).toBe('Mi Diagrama');
    expect(parsed.relations[0].type).toBe('ONE_TO_MANY');
    expect(parsed.classes.find((c) => c.name === 'Venta')?.operations).toEqual([
      { name: 'calcular', returnType: 'Double', visibility: 'public', parameters: 'iva: Double' },
    ]);
  });

  it('round-trips the UML 2.5 details: typed multiplicities, navigability, association class, static/derived/abstract', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'e',
          name: 'Estudiante',
          attributes: [
            { name: 'contador', type: 'Integer', visibility: 'private', isStatic: true },
            { name: 'edad', type: 'Integer', visibility: 'private', isDerived: true },
            { name: 'telefonos', type: 'String', visibility: 'private', multiplicity: '0..*' },
          ],
          operations: [
            { name: 'calcular', returnType: 'Double', visibility: 'public', isAbstract: true },
            { name: 'crear', returnType: 'Estudiante', visibility: 'public', isStatic: true },
          ],
        },
        { id: 'c', name: 'Curso', attributes: [] },
        { id: 'i', name: 'Inscripcion', attributes: [{ name: 'nota', type: 'Double', visibility: 'private' }] },
      ],
      relations: [
        {
          id: 'r1',
          type: 'MANY_TO_MANY',
          sourceClassId: 'e',
          targetClassId: 'c',
          sourceMultiplicity: '2..5',
          targetMultiplicity: '1..*',
          navigability: 'SOURCE_TO_TARGET',
          associationClassId: 'i',
        },
      ],
    };

    const xml = renderXmi('UML25', model);
    // what Enterprise Architect reads
    expect(xml).toContain('<type multiplicity="2..5" aggregation="none"/>');
    expect(xml).toContain('<style value="Navigable=Navigable;Owned=0;"/>');
    expect(xml).toContain('<properties ea_type="Association" subtype="Class" direction="Source -&gt; Destination"/>');
    expect(xml).toContain('<extendedProperties associationclass="id_i"/>');
    expect(xml).toContain('nType="17"');
    expect(xml).toContain('isStatic="true" isDerived="false"');
    expect(xml).toContain('<ownedOperation xmi:id="id_e_op_id_calcular" name="calcular" visibility="public" isAbstract="true">');

    const { model: parsed } = parseXmi(xml);
    const ids = new Map(parsed.classes.map((c) => [c.name, c.id]));
    const est = parsed.classes.find((c) => c.name === 'Estudiante')!;
    expect(est.attributes.find((a) => a.name === 'contador')?.isStatic).toBe(true);
    expect(est.attributes.find((a) => a.name === 'edad')?.isDerived).toBe(true);
    expect(est.attributes.find((a) => a.name === 'telefonos')?.multiplicity).toBe('0..*');
    expect(est.operations?.find((o) => o.name === 'calcular')?.isAbstract).toBe(true);
    expect(est.operations?.find((o) => o.name === 'crear')?.isStatic).toBe(true);
    expect(parsed.relations[0]).toMatchObject({
      type: 'MANY_TO_MANY',
      sourceMultiplicity: '2..5',
      targetMultiplicity: '1..*',
      navigability: 'SOURCE_TO_TARGET',
      associationClassId: ids.get('Inscripcion'),
    });
  });

  it('keeps an Enterprise Architect uml:AssociationClass as a class and an association', () => {
    const xml = `<?xml version="1.0"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
  <uml:Model xmi:type="uml:Model" name="EA_Model">
    <packagedElement xmi:type="uml:Package" xmi:id="EAPK_1" name="Escuela">
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_E" name="Estudiante"/>
      <packagedElement xmi:type="uml:Class" xmi:id="EAID_C" name="Curso"/>
      <packagedElement xmi:type="uml:AssociationClass" xmi:id="EAID_I" name="Inscripcion">
        <ownedAttribute xmi:type="uml:Property" xmi:id="EAID_N" name="nota"><type href="http://schema.omg.org/spec/UML/2.1/uml.xml#Double"/></ownedAttribute>
        <memberEnd xmi:idref="EAID_src"/>
        <memberEnd xmi:idref="EAID_dst"/>
        <ownedEnd xmi:type="uml:Property" xmi:id="EAID_src" association="EAID_I"><type xmi:idref="EAID_E"/></ownedEnd>
        <ownedEnd xmi:type="uml:Property" xmi:id="EAID_dst" association="EAID_I"><type xmi:idref="EAID_C"/></ownedEnd>
      </packagedElement>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;
    const { name, model } = parseXmi(xml);
    expect(name).toBe('Escuela');
    expect(model.classes.map((c) => c.name).sort()).toEqual(['Curso', 'Estudiante', 'Inscripcion']);
    expect(model.relations).toEqual([
      expect.objectContaining({
        id: 'EAID_I_assoc',
        sourceClassId: 'EAID_E',
        targetClassId: 'EAID_C',
        associationClassId: 'EAID_I',
      }),
    ]);
  });

  it('imports an Enterprise Architect package-level uml:Realization as a realization', () => {
    const xml = `<?xml version="1.0"?>
<xmi:XMI xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1" xmlns:xmi="http://schema.omg.org/spec/XMI/2.1">
  <uml:Model xmi:type="uml:Model" name="EA_Model">
    <packagedElement xmi:type="uml:Class" xmi:id="EAID_A" name="Pago"/>
    <packagedElement xmi:type="uml:Interface" xmi:id="EAID_B" name="Notificable"/>
    <packagedElement xmi:type="uml:Realization" xmi:id="EAID_R" client="EAID_A" supplier="EAID_B"/>
  </uml:Model>
</xmi:XMI>`;
    const { model } = parseXmi(xml);
    expect(model.relations).toEqual([
      { id: 'EAID_R', type: 'INHERITANCE', sourceClassId: 'EAID_A', targetClassId: 'EAID_B' },
    ]);
  });

  it('round-trips «enum», «abstract» and «interface» stereotypes', () => {
    const model: UmlModel = {
      classes: [
        {
          id: 'c1',
          name: 'Persona',
          stereotype: 'abstract',
          attributes: [{ name: 'id', type: 'Long', visibility: 'private', isPrimaryKey: true }],
        },
        {
          id: 'c2',
          name: 'Estado',
          stereotype: 'enum',
          attributes: [
            { name: 'ACTIVO', type: 'String', visibility: 'public' },
            { name: 'INACTIVO', type: 'String', visibility: 'public' },
          ],
        },
        {
          id: 'c3',
          name: 'Notificador',
          stereotype: 'interface',
          attributes: [],
          operations: [{ name: 'enviar', returnType: 'void', visibility: 'public' }],
        },
      ],
      relations: [],
    };

    const xml = renderXmi('Stereotypes', model);
    const { model: parsed } = parseXmi(xml);

    const persona = parsed.classes.find((c) => c.name === 'Persona');
    const estado = parsed.classes.find((c) => c.name === 'Estado');
    const notificador = parsed.classes.find((c) => c.name === 'Notificador');

    expect(persona?.stereotype).toBe('abstract');
    expect(estado?.stereotype).toBe('enum');
    expect(estado?.attributes.map((a) => a.name)).toEqual(['ACTIVO', 'INACTIVO']);
    expect(notificador?.stereotype).toBe('interface');
    expect(notificador?.operations).toEqual([
      { name: 'enviar', returnType: 'void', visibility: 'public' },
    ]);
  });

  it('parses Enterprise Architect exported XMI with nested packages', () => {
    const eaXml = `<?xml version="1.0" encoding="UTF-8"?>
<xmi:XMI xmlns:xmi="http://schema.omg.org/spec/XMI/2.1" xmi:version="2.1" xmlns:uml="http://schema.omg.org/spec/UML/2.1">
  <uml:Model xmi:type="uml:Model" name="EA_Model" visibility="public">
    <packagedElement xmi:type="uml:Package" xmi:id="PKG1" name="Starter Class Diagram" visibility="public">
      <packagedElement xmi:type="uml:Class" xmi:id="C1" name="Cliente" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="A1" name="id" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#Integer"/>
        </ownedAttribute>
        <ownedAttribute xmi:type="uml:Property" xmi:id="A2" name="nombre" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#String"/>
        </ownedAttribute>
      </packagedElement>
      <packagedElement xmi:type="uml:Class" xmi:id="C2" name="Pedido" visibility="public">
        <ownedAttribute xmi:type="uml:Property" xmi:id="A3" name="id" visibility="private">
          <type xmi:type="uml:PrimitiveType" href="http://schema.omg.org/spec/UML/2.1/uml.xml#Integer"/>
        </ownedAttribute>
      </packagedElement>
    </packagedElement>
  </uml:Model>
</xmi:XMI>`;
    const { model } = parseXmi(eaXml);
    expect(model.classes).toHaveLength(2);
    const cliente = model.classes.find((c) => c.name === 'Cliente');
    expect(cliente?.attributes).toEqual([
      { name: 'id', type: 'Integer', visibility: 'private', isPrimaryKey: true },
      { name: 'nombre', type: 'String', visibility: 'private', isPrimaryKey: undefined },
    ]);
  });
});
