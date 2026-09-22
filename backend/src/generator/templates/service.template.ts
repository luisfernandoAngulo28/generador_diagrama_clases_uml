import type { UmlClass } from '../../diagrams/uml.types.js';
import { capitalize, decapitalize, toJavaType } from '../java-type.util.js';

export function renderService(cls: UmlClass, packageName: string): string {
  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';
  const varName = decapitalize(cls.name);

  // Solo campos escalares (excluye PK y colecciones) para el update parcial
  const scalarAttrs = cls.attributes.filter(
    (a) => !a.isPrimaryKey && !a.type.startsWith('List') && !a.type.startsWith('Set'),
  );
  const scalarUpdates = scalarAttrs
    .map((a) => `        if (data.get${capitalize(a.name)}() != null) existing.set${capitalize(a.name)}(data.get${capitalize(a.name)}());`)
    .join('\n') + (scalarAttrs.length > 0 ? '\n' : '');

  return `package ${packageName}.service;

import ${packageName}.entity.${cls.name};
import ${packageName}.repository.${cls.name}Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class ${cls.name}Service {

    @Autowired
    private ${cls.name}Repository ${varName}Repository;

    public List<${cls.name}> findAll() {
        return ${varName}Repository.findAll();
    }

    public Optional<${cls.name}> findById(${idJavaType} id) {
        return ${varName}Repository.findById(id);
    }

    public ${cls.name} save(${cls.name} ${varName}) {
        return ${varName}Repository.save(${varName});
    }

    public ${cls.name} update(${idJavaType} id, ${cls.name} data) {
        ${cls.name} existing = ${varName}Repository.findById(id)
                .orElseThrow(() -> new RuntimeException("${cls.name} no encontrado: " + id));
        // Actualizar solo los campos escalares recibidos (evita romper relaciones por JSON parcial)
${scalarUpdates}        return ${varName}Repository.save(existing);
    }

    public void deleteById(${idJavaType} id) {
        ${varName}Repository.deleteById(id);
    }
}
`;
}
