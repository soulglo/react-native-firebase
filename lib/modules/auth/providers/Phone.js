export default {
  credential(token, secret) {
    return {
      token,
      secret,
      provider: 'phone',
      providerId: 'phone',
    };
  },
};
