import ComponentTypes from "@theme-original/NavbarItem/ComponentTypes";
import ExportNavbarItem from "../../components/ExportNavbarItem";
import SaveNavbarItem from "../../components/SaveNavbarItem";
import SettingsNavbarItem from "../../components/SettingsNavbarItem";

export default {
    ...ComponentTypes,
    "custom-export": ExportNavbarItem,
    "custom-save": SaveNavbarItem,
    "custom-settings": SettingsNavbarItem
};
