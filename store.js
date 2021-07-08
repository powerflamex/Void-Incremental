/// Loads the store.
///
/// The arguments passed are the current number, and the current set of upgrades.
/// The returned value is the message to be shown.
export function store (num, upgrades) {
  // The message to post.
  let msg = ''

  // The cost of the next set of upgrades.
  let nextCost = Infinity

  // The next set of upgrades.
  let nextUpgrades = []

  // Prints out all available upgrades.
  for (const name in upgrades) {
    const upgrade = upgrades[name]

    if (upgrade.cost <= num) {
      // The upgrade can be bought.
      if (!upgrade.bought) {
        msg += `\`\`\`${upgrade.description} Requires ${upgrade.cost} points.\`\`\`\n`
      }
    } else if (upgrade.cost < nextCost) {
      // The upgrade is the least expensive that can't be bought.
      nextUpgrades = [upgrade]
      nextCost = upgrade.cost
    } else if (upgrade.cost === nextCost) {
      // The upgrade is as expensive as the the least expensive upgrade that can't be bought.
      nextUpgrades.push(upgrade)
    }
  }

  // There are no upgrades available.
  if (!msg) msg = '```Nothing Available!```\n'

  if (nextUpgrades.length === 1) msg += 'Next upgrade: '
  else if (nextUpgrades.length > 1) msg += 'Next upgrades: '

  // Prints out all upgrades that will be next to become available.
  for (const name in upgrades) {
    const upgrade = upgrades[name]
    msg += `${upgrade.name}, requires ${upgrade.cost} points. `
  }

  return msg
}
