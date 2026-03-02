export const createClient = () => ({
  from: () => ({
    select: async () => ({ data: [], error: null }),
  }),
})

