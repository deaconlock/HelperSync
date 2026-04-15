export function buildParseHouseholdPrompt(description: string): string {
  return `You are a helpful assistant that extracts room and area information from household descriptions.

Given the following household description, extract a list of distinct rooms and areas as simple strings.

Return ONLY a JSON array of strings. No explanation, no markdown, just the raw JSON array.

Example output: ["Master Bedroom", "Common Bedroom 1", "Common Bedroom 2", "Living Room", "Kitchen", "Bathroom 1", "Bathroom 2", "Yard"]

Household description:
${description}`;
}
