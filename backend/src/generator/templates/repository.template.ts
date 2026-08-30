import type { UmlClass } from '../../diagrams/uml.types.js';
import { toJavaType } from '../java-type.util.js';

export function renderRepository(cls: UmlClass, packageName: string): string {
  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';

  return `package ${packageName}.repository;

import ${packageName}.entity.${cls.name};
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ${cls.name}Repository extends JpaRepository<${cls.name}, ${idJavaType}> {
}
`;
}
