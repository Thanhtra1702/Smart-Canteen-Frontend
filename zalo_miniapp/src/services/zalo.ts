export interface ZaloUser {
  id: string;
  name: string;
  avatar: string;
  phoneNumber?: string;
}

export const getZaloUserInfo = async (): Promise<ZaloUser> => {
  const isZaloEnv = typeof window !== 'undefined' && (window as any).ZMP;

  if (isZaloEnv) {
    try {
      const zmp = (window as any).ZMP;
      const res = await zmp.getUserInfo();
      return {
        id: res.userInfo.id,
        name: res.userInfo.name,
        avatar: res.userInfo.avatar,
      };
    } catch (err) {
      console.warn('Native ZMP getUserInfo failed, using dev fallback', err);
    }
  }

  // Dev Mock fallback for local browser testing
  return {
    id: 'zalo_user_1029384',
    name: 'Nguyễn Văn An',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
    phoneNumber: '0988123456',
  };
};

export const getZaloPhoneNumber = async (): Promise<string> => {
  const isZaloEnv = typeof window !== 'undefined' && (window as any).ZMP;

  if (isZaloEnv) {
    try {
      const zmp = (window as any).ZMP;
      const res = await zmp.getPhoneNumber();
      return res.numberToken || '0988123456';
    } catch (err) {
      console.warn('Native getPhoneNumber failed, using dev fallback', err);
    }
  }

  return '0988123456';
};
