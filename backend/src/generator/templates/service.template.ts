import type { UmlClass } from '../../diagrams/uml.types.js';
import { decapitalize, toJavaType } from '../java-type.util.js';

export function renderService(cls: UmlClass, packageName: string): string {
  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';
  const varName = decapitalize(cls.name);

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

    public ${cls.name} update(${idJavaType} id, ${cls.name} ${varName}) {
        ${varName}.setId(id);
        return ${varName}Repository.save(${varName});
    }

    public void deleteById(${idJavaType} id) {
        ${varName}Repository.deleteById(id);
    }
}
`;
}
