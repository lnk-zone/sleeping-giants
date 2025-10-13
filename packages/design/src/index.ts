export interface DesignToken {
  name: string;
  value: string;
}

export const createDesignToken = (name: string, value: string): DesignToken => ({
  name,
  value
});
