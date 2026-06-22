/**
 * Calculates the marker position (0-100%) on a visual scale based on a metric value and normal range.
 * 
 * Range formats supported:
 * - ">=min" or ">min" (e.g., ">=30")
 * - "<=max" or "<max" (e.g., "<=100")
 * - "min-max" (e.g., "30-100")
 * 
 * Returns:
 * - Position percentage for valid ranges (0-100)
 * - null for malformed ranges (to filter out misleading metrics)
 */
export function calculateDynamicPosition(result: number, range: string): number | null {
  if (!range || range.trim() === "") {
    return null // Invalid range - filter out
  }

  // Case 2: Handle "<=max" or "<max" format (mirror of >=min)
  const lessThanMatch = range.match(/(<=?)\s*(\d+\.?\d*)/)
  if (lessThanMatch) {
    const operator = lessThanMatch[1]
    const max = Number.parseFloat(lessThanMatch[2])

    if (isNaN(max)) {
      return null // Malformed - filter out
    }

    const isNormal = operator === "<=" ? result <= max : result < max

    if (isNormal) {
      // Normal - position in green zone (33-67%)
      // Calculate position based on how far below max
      if (max === 0) {
        return 67 // End of green zone when max = 0
      }
      const deficit = max - result
      const percentBelowMax = (deficit / max) * 100
      return Math.max(33, 67 - (percentBelowMax / 100) * 34)
    } else {
      // Abnormal - position in right red zone (67-100%)
      // Calculate how far above the threshold
      if (max === 0) {
        return 95 // Far right if somehow above 0
      }
      const excess = result - max
      const percentOfMax = (excess / max) * 100
      return Math.min(95, 67 + (percentOfMax / 100) * 28)
    }
  }

  // Case 1 & Case 5: Handle ">=min" or ">min" format
  const greaterThanMatch = range.match(/(>=?)\s*(\d+\.?\d*)/)
  if (greaterThanMatch) {
    const operator = greaterThanMatch[1]
    const min = Number.parseFloat(greaterThanMatch[2])

    if (isNaN(min)) {
      return null // Malformed - filter out
    }

    const isNormal = operator === ">=" ? result >= min : result > min

    if (isNormal) {
      // Normal - position in green zone (33-67%)
      // Special case: when min = 0, position at start of green zone
      if (min === 0) {
        return 33
      }
      // Calculate position based on how much above min
      const excess = result - min
      const percentAboveMin = (excess / min) * 100
      return Math.min(67, 33 + (percentAboveMin / 100) * 34)
    } else {
      // Abnormal - position in left red zone (0-33%)
      // Special case: when min = 0, this shouldn't happen (0 >= 0 is normal)
      if (min === 0) {
        return 5 // Far left if somehow negative
      }
      const deficit = min - result
      const percentOfMin = (deficit / min) * 100
      // Position from left: 5% at 0 value, 33% at threshold
      return Math.max(5, 33 - (percentOfMin / 100) * 28)
    }
  }

  // Case 3: Handle "min-max" format (e.g., "30-100")
  const rangeMatch = range.match(/(\d+\.?\d*)\s*-\s*(\d+\.?\d*)/)
  if (rangeMatch) {
    const min = Number.parseFloat(rangeMatch[1])
    const max = Number.parseFloat(rangeMatch[2])

    if (isNaN(min) || isNaN(max) || min > max) {
      return null // Malformed - filter out
    }

    if (result >= min && result <= max) {
      // Normal - position in green zone (33-67%)
      const rangeSpan = max - min
      const positionInRange = result - min
      const percentInRange = rangeSpan === 0 ? 0 : (positionInRange / rangeSpan) * 100
      return 33 + (percentInRange / 100) * 34
    } else if (result < min) {
      // Abnormal - position in left red zone (0-33%)
      const deficit = min - result
      const percentOfMin = min === 0 ? 0 : (deficit / min) * 100
      return Math.max(5, 33 - (percentOfMin / 100) * 28)
    } else {
      // Abnormal - position in right red zone (67-100%)
      const excess = result - max
      const percentOfMax = max === 0 ? 0 : (excess / max) * 100
      return Math.min(95, 67 + (percentOfMax / 100) * 28)
    }
  }

  return null // Case 4: Malformed range - filter out
}
