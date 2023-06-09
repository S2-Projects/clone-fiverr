const { mongoose } = require("mongoose");
const Gig = require("../../models/gig");
const Seller = require("../../models/seller");
const Category = require("../../models/category");
const { join, parse } = require("path");
const { GraphQLUpload } = require("graphql-upload");
const { createWriteStream, unlink } = require("fs");
const { finished } = require("stream/promises");
const sharp = require("sharp");


const queries = {
  // gigs: async () => await Gig.find(),
  gigs: async () =>
    await Gig.find()
      .populate("seller")
      .populate("orders")
      .populate("category")
      .populate("reviews")
      .exec(),
  gig: async (parent, args) =>
    await Gig.findById(args.id)
      .populate("seller")
      .populate("orders")
      .populate("category")
      .populate("reviews")
      .exec(),
};

const mutations = {
  createGig: async (parent, args) => {
    const { seller, title, description, price, category } = args;
    const image = await args.banner;
    let banner = "default.jpg";
    if (image) {
      const { filename, createReadStream } = image.file;
      let stream = createReadStream();
      let { ext, name } = parse(filename);

      let serverFile = join(__dirname, `../../uploads/banners/${filename}`);

      let writeStream = createWriteStream(serverFile);
      stream.pipe(writeStream);
      await finished(writeStream);

      banner =
        name.replace(/([^a-z0-9 ]+)/gi, "-").replace(" ", "_") +
        "-" +
        Date.now() +
        ext;

      sharp(serverFile)
        .resize({ height: 250, width: 400 })
        .toFile(join(__dirname, `../../uploads/banners/${banner}`))
        .then(async function () {
          unlink(serverFile, (err) => {
            if (err) console.log(err);
          });
          console.log("Success");
        })
        .catch(function () {
          console.log("Error occured");
        });
    }
    const gig = new Gig({
      seller,
      title,
      description,
      price,
      category,
      banner,
    });
    const gigSeller = await Seller.findById(
      new mongoose.Types.ObjectId(seller).toString()
    );
    if (!gigSeller) {
      throw new Error(`Seller with ID ${seller} not found`);
    }

    const gigCategory = await Category.findById(
      new mongoose.Types.ObjectId(category).toString()
    );

    if (!gigCategory) {
      throw new Error(`Category with ID ${category} not found`);
    }

    await gig.save();

    gigSeller.gigs.push(gig.id);
    gigCategory.gigs.push(gig.id);

    await gigSeller.save();
    await gigCategory.save();

    return queries.gig(parent, gig);
  },

  updateGig: async (parent, args) => {
    const { id, ...updatedFields } = args;
    console.log(args);
    if (await args.banner !== null && await args.banner !== undefined) {
      // Delete old image if it exists
      const gigToUpdate = await Gig.findById(id);
      console.log(gigToUpdate.banner);
      if (gigToUpdate && gigToUpdate.banner!=="default.jpg") {
        const oldBannerPath = join(__dirname, `../../uploads/banners/${gigToUpdate.banner}`);
        console.log(gigToUpdate.banner);
        unlink(oldBannerPath, (err) => {
          if (err) console.log(err);
        });
      }

      // Save new image
      const image = await args.banner;
      if(image){
      const { filename, createReadStream } = image.file;
      let stream = createReadStream();
      let { ext, name } = parse(filename);

      console.log("3");

      let banner =
        name.replace(/([^a-z0-9]+)/gi, "-").replace(" ", "_") +
        "-" +
        Date.now() +
        ext;

      let serverFile = join(__dirname, `../../uploads/banners/${banner}`);

      let writeStream = createWriteStream(serverFile);
      stream.pipe(writeStream);
      await finished(writeStream);

      console.log("4");

       banner =
      name.replace(/([^a-z0-9]+)/gi, "-").replace(" ", "_") +
      "-" +
      Date.now() +
      ext;
      sharp(serverFile)
        .resize({ height: 250, width: 400 })
        .toFile(join(__dirname, `../../uploads/banners/${banner}`))
        .then(async function () {
          unlink(serverFile, (err) => {
            if (err) console.log(err);
          });
          console.log("Success");
        })
        .catch(function () {
          console.log("Error occured");
        });

        console.log("5");

      

      updatedFields.banner = banner;
      }
    }

    const result = await Gig.findByIdAndUpdate(id, updatedFields, {
      new: true,
    });
    return result;
  },

  deleteGig: async (parent, args) => {
    const { id } = args;
    const gig = await Gig.findById(id).populate("orders").populate("seller");
    if (!gig) {
      throw new Error(`Gig with ID ${id} not found`);
    }

    if (!gig.orders.some((order) => order.status !== "completed")) {
      const gigSeller = await Seller.findById(
        new mongoose.Types.ObjectId(gig.seller)
      );
      gigSeller.gigs = gigSeller.gigs.filter(
        (gig) => new mongoose.Types.ObjectId(gig).toString() !== id
      );
      await gigSeller.save();
      const gigCategory = await Seller.findById(
        new mongoose.Types.ObjectId(gig.seller)
      );
      gigCategory.gigs = gigCategory.gigs.filter(
        (gig) => new mongoose.Types.ObjectId(gig).toString() !== id
      );

      await gigSeller.save();
      await gigCategory.save();

      await gig.deleteOne();
      return gig;
    } else {
      throw new Error(`Cannot delete Gig ${id}: it has active orders`);
    }
  },
};

const resolvers = {
  Upload: GraphQLUpload,
  Query: queries,
  Mutation: mutations,
};

module.exports = resolvers;