import type { UmlClass } from '../../diagrams/uml.types.js';
import { decapitalize, pluralize, toJavaType } from '../java-type.util.js';

export function renderController(cls: UmlClass, packageName: string): string {
  const idAttribute = cls.attributes.find((a) => a.isPrimaryKey);
  const idJavaType = idAttribute ? toJavaType(idAttribute.type) : 'Long';
  const varName = decapitalize(cls.name);
  const basePath = pluralize(varName);

  return `package ${packageName}.controller;

import ${packageName}.entity.${cls.name};
import ${packageName}.service.${cls.name}Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/${basePath}")
@CrossOrigin(origins = "*")
public class ${cls.name}Controller {

    @Autowired
    private ${cls.name}Service ${varName}Service;

    @GetMapping
    public List<${cls.name}> findAll() {
        return ${varName}Service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<${cls.name}> findById(@PathVariable ${idJavaType} id) {
        return ${varName}Service.findById(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ${cls.name} create(@RequestBody ${cls.name} ${varName}) {
        return ${varName}Service.save(${varName});
    }

    @PutMapping("/{id}")
    public ResponseEntity<${cls.name}> update(@PathVariable ${idJavaType} id, @RequestBody ${cls.name} ${varName}) {
        if (${varName}Service.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(${varName}Service.update(id, ${varName}));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable ${idJavaType} id) {
        if (${varName}Service.findById(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ${varName}Service.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
`;
}
