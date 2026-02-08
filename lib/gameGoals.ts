// 各游戏目标：达成任意一个即可返还 2 铒币。前易后难。
export const SURVIVAL_GOALS = [3, 5, 8, 12, 18]      // 波次
export const DUNGEON_GOALS = [2, 3, 5, 7, 10]        // 层数
export const PLATFORMER_GOALS = [80, 200, 400, 800, 1500]  // 距离
export const BULLET_HELL_GOALS = [2, 3, 5, 7, 10]    // 波次
export const RHYTHM_GOALS = [3, 5, 10, 15, 20]       // 击中节拍数
export const IWANNA_GOALS = [30, 60, 120, 200, 300]  // 进度或过关

export function checkSurvivalGoal(wave: number): boolean {
  return SURVIVAL_GOALS.includes(wave)
}
export function checkDungeonGoal(depth: number): boolean {
  return DUNGEON_GOALS.includes(depth)
}
export function checkPlatformerGoal(distance: number): boolean {
  return PLATFORMER_GOALS.some((g) => distance >= g)
}
export function checkBulletHellGoal(wave: number): boolean {
  return BULLET_HELL_GOALS.includes(wave)
}
export function checkRhythmGoal(nodes: number): boolean {
  return RHYTHM_GOALS.includes(nodes)
}
export function checkIwannaGoal(progress: number): boolean {
  return IWANNA_GOALS.some((g) => progress >= g)
}
