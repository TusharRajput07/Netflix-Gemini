// import client from "../utils/openai";
import { IconButton } from "@mui/material";
import Header from "./Header";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { OPTIONS } from "../utils/constants";
import CardList from "./CardList";
import { useMediaQuery, useTheme } from "@mui/material";
import Skeleton from "@mui/material/Skeleton";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Search = () => {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [movieList, setMovieList] = useState(null);
  const [tvList, setTvList] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const theme = useTheme();
  const isLarge = useMediaQuery(theme.breakpoints.up("md"));

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      handleGeminiSearch();
    }
  };

  const fetchMovies = async (movie) => {
    const data = await fetch(
      "https://api.themoviedb.org/3/search/movie?query=" +
        movie +
        "&include_adult=false&language=en-US&page=1",
      OPTIONS,
    );
    const json = await data.json();
    return json?.results;
  };

  const fetchTV = async (tv) => {
    const data = await fetch(
      "https://api.themoviedb.org/3/search/tv?query=" +
        tv +
        "&include_adult=false&language=en-US&page=1",
      OPTIONS,
    );
    const json = await data.json();
    return json?.results;
  };

  //**********************************gemini search****************************************************

  const handleGeminiSearch = async () => {
    try {
      setLoading(true);

      const genAI = new GoogleGenerativeAI(
        process.env.REACT_APP_GEMINI_API_KEY,
      );
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      }); // ← updated model

      const prompt =
        "Act as a movie/TV shows recommendation system. Given the following query: '" +
        searchRef?.current?.value +
        "', provide a list of 20 comma-separated movie/TV shows titles in a single string. First 10 movies and then 10 tv shows, so combined 20. Do not add any heading text. Do not add release year. Example: Interstellar, Inception, Tenet, The Dark Knight, The Departed. If no movies/ tv shows are found, return the string 'Not found'. Limit results to Hollywood movies/tv shows unless a different language is specified.";

      const result = await model.generateContent(prompt);
      if (result.response.text().trim() === "Not found") {
        setErrorMessage("No results found");
        setMovieList(null);
        setTvList(null);
        setLoading(false);
        return;
      }
      setErrorMessage(null);

      const geminiMediaList = result.response.text().split(", ");

      const list1 = geminiMediaList.slice(0, 10);
      const list2 = geminiMediaList.slice(10);

      const promiseMovieList = list1.map((media) => fetchMovies(media));
      const promiseTvList = list2.map((media) => fetchTV(media));

      const tmdbMovieResults = await Promise.all(promiseMovieList);
      const tmdbTvResults = await Promise.all(promiseTvList);

      const filteredTmdbMovies = tmdbMovieResults
        .map((subarray) => subarray?.[0])
        ?.filter((e) => e);
      const filteredTmdbTv = tmdbTvResults
        .map((subarray) => subarray?.[0])
        ?.filter((e) => e);

      setMovieList(filteredTmdbMovies);
      setTvList(filteredTmdbTv);

      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  //*************************************************************************************************

  const loadingSkeleton = () =>
    loading && (
      <div className="pl-6 md:pl-14 py-8">
        <Skeleton
          sx={{ bgcolor: "grey.800" }}
          variant="rectangular"
          className="w-36 mb-5"
        />
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9]?.map((item) => (
            <Skeleton
              key={item}
              sx={{ bgcolor: "grey.800" }}
              variant="rectangular"
              className="min-w-24 md:min-w-32 min-h-36 md:min-h-48"
            />
          ))}
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#252525] relative">
      <Header />
      <div className="w-full pt-16 md:pt-20">
        <div className="flex items-center justify-between">
          <div className="text-white text-xl font-semibold flex items-center pl-2 md:pl-10">
            <IconButton
              color="success"
              onClick={() => {
                navigate("/browse");
              }}
            >
              <ArrowBackIcon
                fontSize={isLarge ? "large" : "medium"}
                className="text-white hover:text-red-500"
              />
            </IconButton>
          </div>
          <div className="flex justify-center">
            <input
              ref={searchRef}
              className="w-full md:w-[30vw] py-2 md:py-4 px-4 rounded-sm text-sm"
              type="text"
              placeholder="horror movies..."
              onKeyDown={handleKeyDown}
            />
            <div
              onClick={handleGeminiSearch}
              className="w-fit py-1 md:py-4 px-3 md:px-6 ml-2 rounded-sm font-semibold cursor-pointer text-white bg-red-500 hover:bg-red-700 flex items-center text-sm"
            >
              Search
            </div>
          </div>
          <div className="w-4 md:w-10"></div>
        </div>
      </div>
      <p className="text-red-600 text-sm md:text-base text-center p-2">
        {errorMessage}
      </p>

      {loadingSkeleton()}
      {loadingSkeleton()}
      <div className="pl-6 md:pl-14 py-8">
        {movieList && (
          <div>
            <h1 className="text-white text-lg font-semibold">Movies</h1>
            <CardList mediaList={movieList} isMovie={true} />
          </div>
        )}
        {tvList && (
          <div>
            <h1 className="text-white text-lg font-semibold">TV Shows</h1>
            <CardList mediaList={tvList} isMovie={false} />
          </div>
        )}
        <div className="text-[#7d7d7d] text-xs md:text-sm flex items-center font-light absolute right-5 md:right-10 bottom-5">
          search feature powered by gemini APIs
          <img
            className="w-10 md:w-20 h-10 object-cover ml-2 md:ml-3 rounded-full shadow-[#156EEA] shadow-md"
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR2BbgiNKtFJXxzi-xOwojRWvboVSHuO7Vt6g&s"
          />
        </div>
      </div>
    </div>
  );
};

export default Search;
