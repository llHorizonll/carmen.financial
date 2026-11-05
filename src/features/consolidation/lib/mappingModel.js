export const emptyMappings = (profileRevision) => ({
  version: 0, profileRevision, accounts: {}, departments: {}, dimensions: {},
});

export const getMappedCodes = (document, kind, member, target, dimensionId) => {
  const values = kind === 'dimensions'
    ? document.dimensions?.[member]?.[dimensionId]?.subcodes?.[target]
    : document[kind]?.[member]?.[target];
  return (values || []).map((value) => typeof value === 'string' ? { code: value } : { ...value });
};

export const getSourceOwners = (document, kind, member, dimensionId) => {
  const targets = kind === 'dimensions'
    ? document.dimensions?.[member]?.[dimensionId]?.subcodes
    : document[kind]?.[member];
  const owners = new Map();
  Object.entries(targets || {}).forEach(([target, codes]) => {
    codes.forEach((value) => owners.set(typeof value === 'string' ? value : value.code, target));
  });
  return owners;
};

export const updateCodeMapping = (document, { kind, member, target, dimensionId, codes }) => {
  const owners = getSourceOwners(document, kind, member, dimensionId);
  const seen = new Set();
  codes.forEach(({ code }) => {
    if (!code || seen.has(code)) throw new Error('Each member code can be selected only once.');
    if (owners.has(code) && owners.get(code) !== target) {
      throw new Error(`${code} is already mapped to ${owners.get(code)}.`);
    }
    seen.add(code);
  });
  const next = structuredClone(document);
  const values = kind === 'accounts'
    ? codes.map(({ code, reverseSign }) => ({ code, reverseSign: Boolean(reverseSign) }))
    : codes.map(({ code }) => code);
  if (kind === 'dimensions') {
    const category = next.dimensions?.[member]?.[dimensionId];
    if (!category?.memberDimensionId) throw new Error('Map the member dimension ID first.');
    next.dimensions = { ...next.dimensions, [member]: {
      ...next.dimensions[member], [dimensionId]: { ...category, subcodes: { ...category.subcodes, [target]: values } },
    } };
    if (values.length === 0) delete next.dimensions[member][dimensionId].subcodes[target];
  } else {
    next[kind] = { ...next[kind], [member]: { ...next[kind]?.[member], [target]: values } };
    if (values.length === 0) delete next[kind][member][target];
  }
  return next;
};

export const updateDimensionCategory = (document, member, dimensionId, memberDimensionId) => {
  const categories = document.dimensions?.[member] || {};
  if (memberDimensionId && Object.entries(categories).some(([id, item]) => id !== dimensionId && item.memberDimensionId === memberDimensionId)) {
    throw new Error('This member dimension ID is already mapped to another headquarters dimension.');
  }
  const previous = categories[dimensionId];
  const next = { ...document, dimensions: { ...document.dimensions, [member]: {
    ...categories, [dimensionId]: {
      memberDimensionId,
      subcodes: previous?.memberDimensionId === memberDimensionId ? previous.subcodes || {} : {},
    },
  } } };
  if (!memberDimensionId) delete next.dimensions[member][dimensionId];
  return next;
};

export const mergeMappedMaster = (master, selected) => {
  const byCode = new Map(master.map((item) => [item.id, item]));
  return selected.map((mapping) => ({
    ...(byCode.get(mapping.code) || { id: mapping.code, name: 'Missing from current master data', missing: true }),
    ...mapping,
  }));
};
