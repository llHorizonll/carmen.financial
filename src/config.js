/* eslint-disable no-unused-vars */

const arrCompany = [
  {
    name: "Carmen.dev (localhost)",
    apiUrl: import.meta.env.DEV
      ? `/Carmen.WebApi`
      : `http://localhost/Carmen.WebApi`,
    adminToken: "f9ebce3d77f2f445dee52ba252cc53ee",
  },
  // {
  //   name: "Carmen.dev (Server)",
  //   apiUrl: `https://dev.carmen4.com/carmen.api`,
  //   adminToken: "f9ebce3d77f2f445dee52ba252cc53ee",
  // },
  {
    name: "deevana",
    apiUrl: `https://deevanaphuket.carmen.blue/carmen.api`,
    adminToken: "cc39c67dc39de5722485e5d6ec00a794",
  },
  {
    name: "Carmen.demo (demo.carmen4.com)",
    apiUrl: `https://carmen4.com/carmen.Demo`,
    adminToken: "70ff70b09e1ee5b9e7155fda6b9a59e2",
  },

  {
    name: "manor (a_13403a2281fd59575a011e99fe14eb1d_akyra)",
    apiUrl: `https://manor.carmen.blue/carmen.api`,
    adminToken: "13403a2281fd59575a011e99fe14eb1d",
  },
  {
    name: "gcmt (a_146ff68007d405929541b37c9c07580c_gnimman)",
    apiUrl: `https://gcmt.carmen.blue/carmen.api`,
    adminToken: "146ff68007d405929541b37c9c07580c",
  },
  {
    name: "Wyndham (siamese) (a_148528d864d4f9bd1ccb28bbede388d9_wyndhambqcc)",
    apiUrl: `https://siamese.carmen.blue/carmen.api`,
    adminToken: "148528d864d4f9bd1ccb28bbede388d9",
  },
  {
    name: "12theresidence",
    apiUrl: `https://12theresidence.carmen.blue/carmen.api/`,
    adminToken: "14edb11be72ee9f3376880742bf1a275",
  },
  {
    name: "Carmen Office (HO)",
    apiUrl: `https://app.carmenwork.com/carmen.api`,
    adminToken: "1c2801844de9d96d42f7274e1ae265eb",
  },
  {
    name: "nexen",
    apiUrl: `https://nexen.carmen.blue/carmen.api`,
    adminToken: "313e8da05609dc6a4ae2de6647661df0",
  },
  {
    name: "Fxnana (fxnn)",
    apiUrl: `https://fxnn.carmen.blue/carmen.api/`,
    adminToken: "334b6fae3ce3ddaded7f4ee03a09e2cf",
  },
  {
    name: "chi",
    apiUrl: `https://chi.carmen.blue/carmen.api/`,
    adminToken: "5457271afa084a8ebffa17863c6a1e22",
  },
  {
    name: "Coralbeach",
    apiUrl: `https://coralbeach.carmen.blue/carmen.Api`,
    adminToken: "56efa87750cbd76b9915855c6b5ef79b",
  },
  {
    name: "homm",
    apiUrl: `https://hothsk.carmen.blue/Carmen.Api/`,
    adminToken: "5f1fede6cbd3416dedabf94533e0bd1d",
  },
  {
    name: "zeavola",
    apiUrl: `https://zeavola.carmen.blue/carmen.api`,
    adminToken: "68cd38f86f260e79dea6728327cd1800",
  },
  {
    name: "Maduzi (chomview,maduzi)",
    apiUrl: `https://maduzi.carmen.blue/carmen.api`,
    adminToken: "6d3bb10a680201b208abd3178ebcecd3",
  },
  {
    name: "Sport Garden (sgr)",
    apiUrl: `https://sgr.carmen.blue/carmen.api`,
    adminToken: "80ee6fd44c29904f17efb56c22d5ee68",
  },
  {
    name: "thomas",
    apiUrl: `https://thomas.carmen.blue/carmen.api`,
    adminToken: "a644d2edd9d60df92cf8db0f43eaa48b",
  },
  {
    name: "seekersfinders",
    apiUrl: `https://seekersfinders.carmen.blue/Carmen.API/`,
    adminToken: "bb35e39e11c1ba9f8651a4da360665f0",
  },
  {
    name: "Diamond Resort (spm)",
    apiUrl: `https://spm.carmen.blue/carmen.api`,
    adminToken: "c07c08ef45e87fa6608b3aef3a6c48dd",
  },
  {
    name: "Homa",
    apiUrl: `https://homa.carmen.blue/carmen.api`,
    adminToken: "d5c3dfb3a55e7af51f3909a1824feca2",
  },
  {
    name: "Sarojin",
    apiUrl: `https://thesarojin.carmen.blue/carmen.api`,
    adminToken: "ec92a08d86fd37cbde85aca8cbee5c00",
  },
  {
    name: "hvklgr",
    apiUrl: `https://hvklgr.carmen.blue/carmen.api`,
    adminToken: "0dd557529d62980fd25fcbbf5168ff37",
  },
  {
    name: "varana hotel",
    apiUrl: `https://varanahotel.carmen.blue/Carmen.Api`,
    adminToken: "3648279f725a976df16464c393e0dde7",
  },
  {
    name: "kappasensesubud",
    apiUrl: `https://kappasensesubud.carmen.blue/Carmen.API/`,
    adminToken: "6afa02b4186911c861decc049896bac7",
  },
  {
    name: "Lilit Banglumphu",
    apiUrl: `https://lilit.carmen.blue/Carmen.API/`,
    adminToken: "dc2df280430e8ef1884a37544b143191",
  },
  {
    name: "bwpluscarapace",
    apiUrl: `https://bwpluscarapace.carmen.blue/Carmen.API/`,
    adminToken: "9031ca09611270931565f94d59fb2968",
  },
  {
    name: "bestwesternchatuchak",
    apiUrl: `https://bestwesternchatuchak.carmen.blue/carmen.api`,
    adminToken: "dea056cd63e02ee572994bd376b43c75",
  },
  {
    name: "myskhaoyai",
    apiUrl: `https://myskhaoyai.carmen.blue/carmen.api/`,
    adminToken: "ba85e5a8185d461636e7d6920981b489",
  },
  {
    name: "nooekunaavashi",
    apiUrl: `https://nooekunaavashi.carmen.blue/carmen.api/`,
    adminToken: "c5e55636ddc9103c884ab72c0e0f6986",
  },
  {
    name: "floralcourthotel",
    apiUrl: `https://floralcourthotel.carmen.blue/carmen.api`,
    adminToken: "f31373e1f8e23e778474c57ae48b0b9e",
  },
  {
    name: "Migration",
    apiUrl: `https://dev.carmen4.com/carmen.api`,
    adminToken: "28037ac5bcf9c5e243e1e1a34ca5c13b",
  },
  {
    name: "SaleDemo",
    apiUrl: `https://saledemo.carmen.blue/carmen.api/`,
    adminToken: "b212a958b1b9a51ea43cb245676ffbcf",
  },
  {
    name: "Trial",
    apiUrl: `https://trial.carmen.blue/carmen.api/`,
    adminToken: "4acd4373c4e9b2398a4cbfbdf893b659",
  },
];

//TODO: switch index arrCompany for default company
const { apiUrl, adminToken } = arrCompany[0];
//TODO: switch show test version dev or anything
const env = "dev";

window.__CARMEN_CONFIG__ = {
  apiUrl,
  adminToken,
  env,
};
