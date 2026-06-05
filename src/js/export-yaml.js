/* Sustainable House Evaluator — YAML Export */

function requireYaml() {
  if (!window.jsyaml?.dump) {
    throw new Error('YAML export is unavailable because the YAML library did not load.');
  }
  return window.jsyaml;
}

function slugify(value) {
  return String(value ?? 'house')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'house';
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normaliseAssessments(assessments) {
  return [...(assessments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function toYAMLString(profile, assessments) {
  if (!profile?.id || !profile?.nickname) {
    throw new Error('A saved house profile is required before you can export YAML.');
  }

  const yaml = requireYaml();
  const snapshots = normaliseAssessments(assessments);
  const capacity = {
    budget_range: profile.capacity?.budget_range ?? null,
    time_availability: profile.capacity?.time_availability ?? null,
    skill_level: profile.capacity?.skill_level ?? null,
    ambition_level: profile.capacity?.ambition_level ?? null,
    assessor_name: profile.capacity?.assessor_name ?? null,
    assessor_company: profile.capacity?.assessor_company ?? null,
  };

  const documentData = {
    schema_version: '1.0',
    exported_at: new Date().toISOString(),
    house: {
      id: profile.id,
      nickname: profile.nickname,
      year_built: profile.year_built,
      floor_area_sqm: profile.floor_area_sqm,
      storeys: profile.storeys,
      construction_type: profile.construction_type,
      climate_zone: profile.climate_zone,
      occupant_count: profile.occupant_count,
      created_at: profile.created_at,
    },
    capacity,
    assessments: snapshots.map((assessment) => ({
      id: assessment.id,
      created_at: assessment.created_at,
      updated_at: assessment.updated_at ?? assessment.created_at,
      overall_score: assessment.overall_score ?? 0,
      assessor_name: capacity.assessor_name,
      assessor_company: capacity.assessor_company,
      categories: (assessment.categories ?? []).map((category) => ({
        name: category.name,
        score: category.score ?? null,
        completion_pct: category.completion_pct ?? 0,
        items: (category.items ?? []).map((item) => ({
          key: item.key,
          slider_value: item.slider_value ?? 0,
          not_applicable: Boolean(item.not_applicable),
          notes: item.notes || null,
        })),
      })),
    })),
  };

  return yaml.dump(documentData, { lineWidth: 120, noRefs: true });
}

export function exportToYAML(profile, assessments) {
  const yamlString = toYAMLString(profile, assessments);
  const blob = new Blob([yamlString], { type: 'text/yaml' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `susty-house-${slugify(profile.nickname)}-${today()}.yaml`;
  anchor.hidden = true;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

// MANUAL TEST CHECKLIST (run in browser console):
// 1. Create a profile, complete one assessment, export YAML -> verify assessments: has 1 entry.
// 2. Re-import, start a new assessment for the same profile, complete it, export again
//    -> verify assessments: has 2 entries, each with distinct created_at and overall_score.
// 3. Import the 2-snapshot YAML in a fresh browser profile -> verify both snapshots are present.
// 4. Verify exported YAML is valid with window.jsyaml.load(exportedText) in the browser console.
