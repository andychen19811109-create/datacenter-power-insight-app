const isObject = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const resolvePointer = (root, pointer) => (
  pointer
    .replace(/^#\//, "")
    .split("/")
    .reduce((value, segment) => value?.[segment.replace(/~1/g, "/").replace(/~0/g, "~")], root)
);

const typeMatches = (value, type) => {
  if (type === "object") return isObject(value);
  if (type === "array") return Array.isArray(value);
  if (type === "string") return typeof value === "string";
  if (type === "boolean") return typeof value === "boolean";
  if (type === "number") return typeof value === "number" && Number.isFinite(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  return true;
};

export const validateJsonSchemaInstance = (
  schema,
  value,
  { externalSchemas = {}, rootSchema = schema, path = "$" } = {},
) => {
  const errors = [];
  const walk = (node, current, currentPath, root) => {
    if (!node || typeof node !== "object") {
      errors.push(`${currentPath}:schema_invalid`);
      return;
    }
    if (node.$ref) {
      const target = node.$ref.startsWith("#/")
        ? resolvePointer(root, node.$ref)
        : externalSchemas[node.$ref];
      if (!target) {
        errors.push(`${currentPath}:ref_unresolved:${node.$ref}`);
        return;
      }
      walk(target, current, currentPath, node.$ref.startsWith("#/") ? root : target);
      return;
    }
    if (Array.isArray(node.oneOf)) {
      const matches = node.oneOf.filter((candidate) => (
        validateJsonSchemaInstance(candidate, current, {
          externalSchemas,
          rootSchema: root,
          path: currentPath,
        }).length === 0
      ));
      if (matches.length !== 1) errors.push(`${currentPath}:oneOf`);
      return;
    }
    if (Object.hasOwn(node, "const") && !sameValue(current, node.const)) {
      errors.push(`${currentPath}:const`);
      return;
    }
    if (Array.isArray(node.enum) && !node.enum.some((entry) => sameValue(entry, current))) {
      errors.push(`${currentPath}:enum`);
      return;
    }
    if (node.type && !typeMatches(current, node.type)) {
      errors.push(`${currentPath}:type:${node.type}`);
      return;
    }
    if (typeof current === "string") {
      if (node.minLength !== undefined && current.length < node.minLength) {
        errors.push(`${currentPath}:minLength`);
      }
      if (node.maxLength !== undefined && current.length > node.maxLength) {
        errors.push(`${currentPath}:maxLength`);
      }
      if (node.pattern && !(new RegExp(node.pattern).test(current))) {
        errors.push(`${currentPath}:pattern`);
      }
    }
    if (Array.isArray(current)) {
      if (node.minItems !== undefined && current.length < node.minItems) {
        errors.push(`${currentPath}:minItems`);
      }
      if (node.maxItems !== undefined && current.length > node.maxItems) {
        errors.push(`${currentPath}:maxItems`);
      }
      if (node.uniqueItems === true) {
        const serialized = current.map((entry) => JSON.stringify(entry));
        if (new Set(serialized).size !== serialized.length) errors.push(`${currentPath}:uniqueItems`);
      }
      if (node.items) {
        current.forEach((entry, index) => walk(
          node.items,
          entry,
          `${currentPath}[${index}]`,
          root,
        ));
      }
    }
    if (isObject(current)) {
      const properties = node.properties || {};
      (node.required || []).forEach((key) => {
        if (!Object.hasOwn(current, key)) errors.push(`${currentPath}.${key}:required`);
      });
      if (node.additionalProperties === false) {
        Object.keys(current).forEach((key) => {
          if (!Object.hasOwn(properties, key)) errors.push(`${currentPath}.${key}:additional`);
        });
      }
      Object.entries(properties).forEach(([key, childSchema]) => {
        if (Object.hasOwn(current, key)) {
          walk(childSchema, current[key], `${currentPath}.${key}`, root);
        }
      });
    }
  };
  walk(schema, value, path, rootSchema);
  return errors;
};

export const validateSchemaArtifact = (schema, expectedId) => {
  const errors = [];
  if (!isObject(schema)) errors.push("schema_not_object");
  if (schema?.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    errors.push("schema_draft_invalid");
  }
  if (schema?.$id !== expectedId) errors.push("schema_id_invalid");
  if (!(schema?.type || schema?.oneOf)) errors.push("schema_root_constraint_missing");
  return errors;
};
