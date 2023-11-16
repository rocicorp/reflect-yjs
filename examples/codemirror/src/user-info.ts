export type UserInfo = {
  name: string;
  avatar: string;
  color: string;
};
export function randUserInfo(): UserInfo {
  const [avatar, name] = avatars[randInt(0, avatars.length - 1)];
  return {
    avatar,
    name,
    color: colors[randInt(0, colors.length - 1)],
  };
}

export const colors = ['#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f'];

export const avatars = [
  ['🐶', 'Puppy'],
  ['🐱', 'Kitty'],
  ['🐭', 'Mouse'],
  ['🐹', 'Hamster'],
  ['🐰', 'Bunny'],
];

export function randInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}
